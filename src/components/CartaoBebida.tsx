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
  const [isHovered, setIsHovered] = useState(false)
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
    <div 
      className="card-produto group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Container principal com profundidade e efeitos avançados */}
      <div className="relative w-full aspect-[4/5] overflow-hidden 
                      bg-gradient-to-br from-blue-50/50 via-cyan-50/30 to-sky-100/40 
                      dark:from-zinc-950 dark:via-blue-950/20 dark:to-zinc-900 
                      rounded-t-2xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)]">
        
        {/* Background dinâmico com gradiente radial */}
        <div className="absolute inset-0 bg-gradient-radial from-cyan-100/20 via-transparent to-transparent 
                        dark:from-cyan-900/10 opacity-60 group-hover:opacity-100 
                        transition-opacity duration-700" />
        
        {/* Container da imagem com efeitos avançados */}
        <div className="relative w-full h-full flex items-center justify-center 
                        perspective-1000">
          
          {/* Loading state melhorado */}
          {!imagemCarregada && bebida.imagem_url && (
            <div className="absolute inset-0 flex items-center justify-center z-10
                          bg-gradient-to-br from-neutral-100/80 via-cyan-50/60 to-blue-100/60
                          dark:from-zinc-900/80 dark:via-zinc-800/60 dark:to-zinc-700/60
                          backdrop-blur-sm">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 border-4 border-cyan-200/50 
                              border-t-cyan-600 rounded-full animate-spin" />
                <div className="absolute inset-0 w-12 h-12 sm:w-14 sm:h-14 border-4 border-transparent 
                              border-r-cyan-400/30 rounded-full animate-spin-reverse" />
              </div>
            </div>
          )}
          
          {bebida.imagem_url ? (
            <>
              {/* Container da imagem com transformações 3D */}
              <div className="relative w-full h-full flex items-center justify-center 
                              p-3 sm:p-4 md:p-5
                              transform transition-all duration-700 ease-out
                              group-hover:scale-[1.03]">
                
                {/* Imagem com filtros avançados e efeitos */}
                <div className="relative w-full h-full 
                                transition-all duration-700">
                  <Image
                    src={bebida.imagem_url}
                    alt={bebida.nome}
                    fill
                    priority={false}
                    className={`object-contain transition-all duration-700 ease-out
                              ${imagemCarregada ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                              group-hover:scale-[1.12]
                              drop-shadow-[0_20px_50px_rgba(0,0,0,0.25)]
                              group-hover:drop-shadow-[0_30px_70px_rgba(0,0,0,0.35)]`}
                    onLoad={() => setImagemCarregada(true)}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{
                      objectPosition: 'center center',
                      filter: isHovered 
                        ? 'brightness(1.08) contrast(1.05) saturate(1.12)' 
                        : 'brightness(1.02) contrast(1.02) saturate(1.06)',
                      transition: 'filter 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </div>
                
                {/* Overlay de brilho radial dinâmico */}
                <div className={`absolute inset-0 
                                bg-gradient-radial from-white/10 via-white/0 to-transparent
                                dark:from-cyan-400/5 dark:via-white/0
                                opacity-0 group-hover:opacity-100
                                transition-opacity duration-700
                                pointer-events-none
                                ${isHovered ? 'animate-shimmer-glow' : ''}`} />
                
                {/* Overlay de profundidade com gradiente radial */}
                <div className="absolute inset-0 
                              bg-gradient-radial from-transparent via-transparent to-black/15
                              dark:to-black/30
                              opacity-0 group-hover:opacity-100
                              transition-opacity duration-700
                              pointer-events-none" />
                
                {/* Efeito de brilho superior */}
                <div className="absolute top-0 left-0 right-0 h-1/3
                              bg-gradient-to-b from-white/15 via-white/5 to-transparent
                              dark:from-white/8 dark:via-white/2
                              opacity-0 group-hover:opacity-100
                              transition-opacity duration-700
                              pointer-events-none
                              blur-sm" />
                
                {/* Reflexo inferior sutil */}
                <div className="absolute bottom-0 left-0 right-0 h-1/4
                              bg-gradient-to-t from-black/5 via-transparent to-transparent
                              opacity-0 group-hover:opacity-100
                              transition-opacity duration-700
                              pointer-events-none" />
              </div>
              
              {/* Efeito de brilho lateral no hover */}
              <div className="absolute inset-0 
                            bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent
                            dark:via-cyan-900/20
                            opacity-0 group-hover:opacity-100
                            transform -skew-x-12 -translate-x-full group-hover:translate-x-full
                            transition-all duration-1000 ease-in-out
                            pointer-events-none
                            blur-xl" />
            </>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="text-6xl transform transition-transform duration-300 group-hover:scale-110">🥤</div>
            </div>
          )}
        </div>
        
        {/* Sombra interna para profundidade */}
        <div className="absolute inset-0 
                      shadow-[inset_0_0_60px_rgba(0,0,0,0.05)]
                      dark:shadow-[inset_0_0_80px_rgba(0,0,0,0.15)]
                      group-hover:shadow-[inset_0_0_80px_rgba(0,0,0,0.08)]
                      dark:group-hover:shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]
                      transition-shadow duration-700
                      pointer-events-none rounded-t-2xl" />
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 
                         bg-cyan-100 dark:bg-cyan-950/30 rounded-full">
            Bebidas
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {bebida.nome}
        </h3>

        {bebida.tamanho && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-1 flex-grow">
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
            className="bg-gradient-to-r from-dourado-600 to-dourado-500 text-white p-3 rounded-full 
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

