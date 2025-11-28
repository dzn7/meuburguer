'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Star, ImageIcon } from 'lucide-react'
import { Produto } from '@/lib/supabase'

type CartaoProdutoProps = {
  produto: Produto
  onAdicionar: (produto: Produto) => void
}

export default function CartaoProduto({ produto, onAdicionar }: CartaoProdutoProps) {
  const [imagemCarregada, setImagemCarregada] = useState(false)
  const [erroImagem, setErroImagem] = useState(false)
  
  const temImagemValida = produto.imagem_url && produto.imagem_url.trim() !== '' && !erroImagem

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-md hover:shadow-xl 
                    transition-all duration-300 flex flex-col h-full border border-zinc-100 dark:border-zinc-800
                    group">
      {/* Imagem - Proporção 4:3 para ser mais compacta */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 z-20 flex justify-between">
          {produto.desconto && produto.desconto > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{produto.desconto}%
            </span>
          )}
          {produto.destaque && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ml-auto">
              <Star className="w-3 h-3 fill-current" />
            </span>
          )}
        </div>

        {/* Loading */}
        {!imagemCarregada && temImagemValida && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Imagem */}
        {temImagemValida ? (
          <Image
            src={produto.imagem_url!}
            alt={produto.nome}
            fill
            className={`object-cover transition-all duration-500 group-hover:scale-105
                      ${imagemCarregada ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImagemCarregada(true)}
            onError={() => setErroImagem(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-3 flex flex-col flex-grow">
        {/* Categoria */}
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
          {produto.categoria}
        </span>

        {/* Nome */}
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1 mb-1">
          {produto.nome}
        </h3>

        {/* Descrição */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2 flex-grow min-h-[2rem]">
          {produto.descricao}
        </p>

        {/* Preço e Botão */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col">
            {produto.desconto && produto.desconto > 0 && produto.preco_original && (
              <span className="text-[10px] text-zinc-400 line-through">
                R$ {produto.preco_original.toFixed(2)}
              </span>
            )}
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-500">
              R$ {produto.preco.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => onAdicionar(produto)}
            className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-full 
                     shadow-md hover:shadow-lg transform hover:scale-110 transition-all duration-200"
            aria-label={`Adicionar ${produto.nome} ao carrinho`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

