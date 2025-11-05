'use client'

import { useState, useEffect } from 'react'
import { X, Check, Search } from 'lucide-react'
import Image from 'next/image'
import { Produto, Adicional, supabase } from '@/lib/supabase'
import { useCarrinho } from '@/contexts/CarrinhoContext'

type ModalComplementosProps = {
  produto: Produto | null
  aberto: boolean
  onFechar: () => void
  onAbrirCarrinho: () => void
}

export default function ModalComplementos({ produto, aberto, onFechar, onAbrirCarrinho }: ModalComplementosProps) {
  const { adicionarItem } = useCarrinho()
  const [adicionais, setAdicionais] = useState<Adicional[]>([])
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<Adicional[]>([])
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)

  // Bloqueia scroll do body quando modal está aberto
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = '0px'
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
    if (aberto && produto) {
      carregarAdicionais()
      setQuantidade(1)
      setObservacoes('')
      setAdicionaisSelecionados([])
      setBusca('')
    }
  }, [aberto, produto])

  const carregarAdicionais = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('adicionais')
        .select('*')
        .eq('disponivel', true)
        .order('ordem', { ascending: true })

      if (error) throw error
      setAdicionais(data || [])
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error)
    } finally {
      setCarregando(false)
    }
  }

  const toggleAdicional = (adicional: Adicional) => {
    setAdicionaisSelecionados((prev) => {
      const existe = prev.find((a) => a.id === adicional.id)
      if (existe) {
        return prev.filter((a) => a.id !== adicional.id)
      }
      return [...prev, adicional]
    })
  }

  const calcularTotal = () => {
    if (!produto) return 0
    const subtotalAdicionais = adicionaisSelecionados.reduce((acc, ad) => acc + ad.preco, 0)
    return (produto.preco + subtotalAdicionais) * quantidade
  }

  const confirmar = () => {
    if (!produto) return
    adicionarItem(produto, quantidade, adicionaisSelecionados, observacoes)
    onFechar()
    setTimeout(() => {
      onAbrirCarrinho()
    }, 300)
  }

  const adicionaisFiltrados = adicionais.filter((ad) =>
    ad.nome.toLowerCase().includes(busca.toLowerCase())
  )

  if (!aberto || !produto) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div className="modal-content">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-gradient">Personalize seu pedido</span>
          </h3>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar complementos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-campo pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {carregando ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-dourado-200 border-t-dourado-600 rounded-full animate-spin" />
            </div>
          ) : adicionaisFiltrados.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">
              Nenhum complemento encontrado
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {adicionaisFiltrados.map((adicional) => {
                const selecionado = adicionaisSelecionados.some((a) => a.id === adicional.id)
                return (
                  <button
                    key={adicional.id}
                    onClick={() => toggleAdicional(adicional)}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center text-center
                      ${
                        selecionado
                          ? 'border-dourado-600 bg-dourado-50 dark:bg-dourado-950/20 shadow-lg scale-105'
                          : 'border-gray-200 dark:border-gray-800 hover:border-dourado-400 hover:shadow-md'
                      }`}
                  >
                    {selecionado && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-dourado-600 to-dourado-500 
                                    rounded-full flex items-center justify-center shadow-lg z-10
                                    animate-[pulse_1s_ease-in-out_infinite]">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="relative w-16 h-16 mb-2 rounded-lg overflow-hidden
                                  bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900
                                  shadow-inner">
                      <Image
                        src={adicional.imagem_url}
                        alt={adicional.nome}
                        fill
                        className="object-contain p-2 transition-transform duration-300
                                 group-hover:scale-110"
                        sizes="64px"
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      {adicional.nome}
                    </span>
                    <span className="text-sm font-bold text-dourado-600 dark:text-dourado-500">
                      + R$ {adicional.preco.toFixed(2)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantidade
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                           transition-colors flex items-center justify-center font-bold text-lg"
                >
                  -
                </button>
                <span className="text-xl font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">
                  {quantidade}
                </span>
                <button
                  onClick={() => setQuantidade(quantidade + 1)}
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                           transition-colors flex items-center justify-center font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observações
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Alguma observação sobre o pedido?"
                rows={3}
                className="input-campo resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Total:</span>
            <span className="text-2xl font-extrabold text-gradient">
              R$ {calcularTotal().toFixed(2)}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onFechar}
              className="flex-1 py-3 px-4 rounded-full border-2 border-gray-300 dark:border-gray-700 
                       text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 
                       transition-all duration-300"
            >
              Cancelar
            </button>
            <button onClick={confirmar} className="flex-1 btn-primary">
              <Check className="w-5 h-5" />
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

