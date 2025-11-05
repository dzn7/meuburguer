'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { GlassWater, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Bebida, supabase } from '@/lib/supabase'
import { useCarrinho } from '@/contexts/CarrinhoContext'

type SugestaoBebidaProps = {
  mostrar: boolean
  onFechar: () => void
}

export default function SugestaoBebidas({ mostrar, onFechar }: SugestaoBebidaProps) {
  const [bebidas, setBebidas] = useState<Bebida[]>([])
  const [expandido, setExpandido] = useState(false)
  const { adicionarItem } = useCarrinho()

  useEffect(() => {
    if (mostrar) {
      carregarBebidas()
    }
  }, [mostrar])

  const carregarBebidas = async () => {
    try {
      const { data, error } = await supabase
        .from('bebidas')
        .select('*')
        .eq('disponivel', true)
        .order('ordem', { ascending: true })
        .limit(6)

      if (error) throw error
      setBebidas(data || [])
    } catch (error) {
      console.error('Erro ao carregar bebidas:', error)
    }
  }

  const adicionarBebida = (bebida: Bebida) => {
    const produtoBebida = {
      id: bebida.id,
      nome: bebida.nome,
      descricao: bebida.tamanho || '',
      preco: bebida.preco,
      categoria: 'Bebidas',
      imagem_url: bebida.imagem_url || '/assets/bebidas/default.png',
      disponivel: true,
      ordem: bebida.ordem,
      destaque: false,
      created_at: bebida.created_at,
      updated_at: bebida.updated_at,
    }
    
    adicionarItem(produtoBebida, 1, [], undefined)
    onFechar()
  }

  if (!mostrar) return null

  return (
    <div className="bg-gradient-to-r from-dourado-50 to-creme-50 dark:from-dourado-950/20 dark:to-creme-950/20 
                    border-2 border-dourado-200 dark:border-dourado-800 rounded-xl overflow-hidden mb-6 animate-slideInDown relative">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setExpandido(!expandido)}
          className="flex items-center gap-2 flex-1 hover:opacity-80 transition-opacity"
        >
          <GlassWater className="w-5 h-5 text-dourado-600 dark:text-dourado-400" />
          <h4 className="font-bold text-gray-900 dark:text-white">
            Que tal uma bebida?
          </h4>
          {expandido ? (
            <ChevronUp className="w-5 h-5 text-dourado-600 dark:text-dourado-400 ml-auto" />
          ) : (
            <ChevronDown className="w-5 h-5 text-dourado-600 dark:text-dourado-400 ml-auto" />
          )}
        </button>
        
        <button
          onClick={onFechar}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Fechar sugestão"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {expandido && (
        <div className="px-4 pb-4 animate-slideInDown">

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Complete seu pedido com uma deliciosa bebida gelada!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {bebidas.map((bebida) => (
          <button
            key={bebida.id}
            onClick={() => adicionarBebida(bebida)}
            className="bg-white dark:bg-[#101010] border border-gray-200/80 dark:border-gray-800 
                     rounded-xl p-3 hover:border-dourado-400 dark:hover:border-dourado-600 
                     hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)]
                     transition-all duration-300 text-left group flex items-center gap-3"
          >
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden
                            bg-gradient-to-br from-creme-100 via-white to-dourado-50/60
                            dark:from-[#0d0d0d] dark:via-[#141414] dark:to-[#1a1a1a]
                            border border-white/60 dark:border-white/10">
              {bebida.imagem_url ? (
                <Image
                  src={bebida.imagem_url}
                  alt={bebida.nome}
                  fill
                  className="object-contain p-1 transition-transform duration-500 group-hover:scale-110"
                  sizes="64px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                  🥤
                </div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                              bg-gradient-to-br from-white/10 via-transparent to-dourado-500/30 dark:to-dourado-900/25" />
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-dourado-600 dark:group-hover:text-dourado-400 transition-colors">
                  {bebida.nome}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 group-hover:text-dourado-500 dark:group-hover:text-dourado-400 transition-colors">
                  R$ {bebida.preco.toFixed(2)}
                </span>
              </div>
              {bebida.tamanho && (
                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                  {bebida.tamanho}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 text-dourado-600 dark:text-dourado-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Adicionar
                <span aria-hidden className="translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </button>
        ))}
      </div>

          {bebidas.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
              Carregando bebidas...
            </p>
          )}
        </div>
      )}
    </div>
  )
}

