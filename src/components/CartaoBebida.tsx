'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Bebida } from '@/lib/supabase'
import { useCarrinho } from '@/contexts/CarrinhoContext'

type CartaoBebidaProps = {
  bebida: Bebida
}

export default function CartaoBebida({ bebida }: CartaoBebidaProps) {
  const [imagemCarregada, setImagemCarregada] = useState(false)
  const { adicionarItem } = useCarrinho()

  const adicionarAoCarrinho = () => {
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
  }

  return (
    <div className="card-produto group">
      <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        {bebida.imagem_url ? (
          <div className="relative w-full h-full">
            {!imagemCarregada && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-dourado-600 rounded-full animate-spin" />
              </div>
            )}
            <Image
              src={bebida.imagem_url}
              alt={bebida.nome}
              fill
              className={`object-contain p-4 transition-all duration-500 ${
                imagemCarregada ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImagemCarregada(true)}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="text-6xl">🥤</div>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
          {bebida.nome}
        </h3>

        {bebida.tamanho && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {bebida.tamanho}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-gradient">
              R$ {bebida.preco.toFixed(2)}
            </span>
          </div>

          <button
            onClick={adicionarAoCarrinho}
            className="bg-dourado-600 hover:bg-dourado-700 text-white p-3 rounded-full 
                     shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300
                     flex items-center justify-center group"
            aria-label={`Adicionar ${bebida.nome} ao carrinho`}
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  )
}

