'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, ImageIcon } from 'lucide-react'
import { Bebida } from '@/lib/supabase'
import { useCarrinho } from '@/contexts/CarrinhoContext'

type CartaoBebidaProps = {
  bebida: Bebida
}

export default function CartaoBebida({ bebida }: CartaoBebidaProps) {
  const [imagemCarregada, setImagemCarregada] = useState(false)
  const [erroImagem, setErroImagem] = useState(false)
  const { adicionarItem } = useCarrinho()

  const temImagemValida = bebida.imagem_url && bebida.imagem_url.trim() !== '' && !erroImagem

  const adicionarAoCarrinho = () => {
    const produtoBebida = {
      id: bebida.id,
      nome: bebida.nome,
      descricao: bebida.tamanho || '',
      preco: bebida.preco,
      categoria: 'Bebidas',
      imagem_url: bebida.imagem_url || '',
      disponivel: true,
      ordem: bebida.ordem,
      destaque: false,
      created_at: bebida.created_at,
      updated_at: bebida.updated_at,
    }
    
    adicionarItem(produtoBebida, 1, [], undefined)
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-md hover:shadow-xl 
                    transition-all duration-300 flex flex-col h-full border border-zinc-100 dark:border-zinc-800
                    group">
      {/* Imagem - Proporção 1:1 para bebidas */}
      <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-800 dark:to-amber-950/30">
        {/* Loading */}
        {!imagemCarregada && temImagemValida && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Imagem */}
        {temImagemValida ? (
          <Image
            src={bebida.imagem_url!}
            alt={bebida.nome}
            fill
            className={`object-contain p-2 transition-all duration-500 group-hover:scale-105
                      ${imagemCarregada ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImagemCarregada(true)}
            onError={() => setErroImagem(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🥤</span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-3 flex flex-col flex-grow">
        {/* Categoria */}
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
          Bebidas
        </span>

        {/* Nome */}
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1 mb-1">
          {bebida.nome}
        </h3>

        {/* Tamanho */}
        {bebida.tamanho && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            {bebida.tamanho}
          </p>
        )}

        {/* Preço e Botão */}
        <div className="flex items-center justify-between pt-2 mt-auto border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-base font-extrabold text-amber-600 dark:text-amber-500">
            R$ {bebida.preco.toFixed(2)}
          </span>

          <button
            onClick={adicionarAoCarrinho}
            className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-full 
                     shadow-md hover:shadow-lg transform hover:scale-110 transition-all duration-200"
            aria-label={`Adicionar ${bebida.nome} ao carrinho`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

