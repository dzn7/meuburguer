'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Star } from 'lucide-react'
import { Produto } from '@/lib/supabase'

type CartaoProdutoProps = {
  produto: Produto
  onAdicionar: (produto: Produto) => void
}

export default function CartaoProduto({ produto, onAdicionar }: CartaoProdutoProps) {
  const [imagemCarregada, setImagemCarregada] = useState(false)

  return (
    <div className="card-produto group">
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-dourado-50 to-creme-100 dark:from-gray-800 dark:to-gray-900">
        {produto.destaque && (
          <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-dourado-600 to-dourado-500 
                        text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            DESTAQUE
          </div>
        )}
        
        {produto.desconto && produto.desconto > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-red-600 to-red-500 
                        text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
            {produto.desconto}% OFF
          </div>
        )}
        
        <div className="relative w-full h-full">
          {!imagemCarregada && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-dourado-200 border-t-dourado-600 rounded-full animate-spin" />
            </div>
          )}
          <Image
            src={produto.imagem_url}
            alt={produto.nome}
            fill
            className={`object-cover transition-all duration-500 group-hover:scale-110 ${
              imagemCarregada ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImagemCarregada(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-dourado-700 dark:text-dourado-400 
                         bg-dourado-100 dark:bg-dourado-950/30 rounded-full">
            {produto.categoria}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {produto.nome}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 flex-grow">
          {produto.descricao}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col">
            {produto.desconto && produto.desconto > 0 && produto.preco_original && (
              <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                R$ {produto.preco_original.toFixed(2)}
              </span>
            )}
            <span className="text-2xl font-extrabold text-gradient">
              R$ {produto.preco.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => onAdicionar(produto)}
            className="bg-gradient-to-r from-dourado-600 to-dourado-500 text-white p-3 rounded-full 
                     shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300
                     flex items-center justify-center group"
            aria-label={`Adicionar ${produto.nome} ao carrinho`}
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  )
}

