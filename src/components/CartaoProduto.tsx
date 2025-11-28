'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Star, ImageIcon } from 'lucide-react'
import { Produto } from '@/lib/supabase'

// Imagem padrão quando o produto não tem imagem
const IMAGEM_PADRAO = '/placeholder-produto.png'

type CartaoProdutoProps = {
  produto: Produto
  onAdicionar: (produto: Produto) => void
}

export default function CartaoProduto({ produto, onAdicionar }: CartaoProdutoProps) {
  const [imagemCarregada, setImagemCarregada] = useState(false)
  const [erroImagem, setErroImagem] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  // Verifica se tem uma URL de imagem válida
  const temImagemValida = produto.imagem_url && produto.imagem_url.trim() !== '' && !erroImagem
  const urlImagem = temImagemValida ? produto.imagem_url : IMAGEM_PADRAO

  return (
    <div 
      className="card-produto group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Container principal com profundidade e efeitos avançados */}
      <div className="relative w-full aspect-square overflow-hidden 
                      bg-gradient-to-br from-neutral-50 via-dourado-50/30 to-creme-100/40 
                      dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800 
                      rounded-t-2xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)]">
        
        {/* Background dinâmico com gradiente radial */}
        <div className="absolute inset-0 bg-gradient-radial from-dourado-100/20 via-transparent to-transparent 
                        dark:from-dourado-900/10 opacity-60 group-hover:opacity-100 
                        transition-opacity duration-700" />
        
        {/* Badges - Destaque com glassmorphism avançado */}
        {produto.destaque && (
          <div className="absolute top-3 right-3 z-30 
                        bg-gradient-to-br from-dourado-500/95 via-dourado-600/95 to-dourado-700/95
                        backdrop-blur-xl backdrop-saturate-150
                        text-white text-xs font-black px-3 py-1.5 sm:px-4 sm:py-2 
                        rounded-full shadow-[0_8px_32px_rgba(184,134,11,0.4)]
                        border border-dourado-400/60
                        flex items-center gap-1.5
                        transform transition-all duration-300
                        group-hover:scale-110 group-hover:shadow-[0_12px_40px_rgba(184,134,11,0.6)]
                        animate-[pulse_2s_ease-in-out_infinite]">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-current drop-shadow-lg" />
            <span className="hidden sm:inline tracking-wide">DESTAQUE</span>
          </div>
        )}
        
        {/* Badges - Desconto com glassmorphism avançado */}
        {produto.desconto && produto.desconto > 0 && (
          <div className="absolute top-3 left-3 z-30 
                        bg-gradient-to-br from-red-500/95 via-red-600/95 to-red-700/95
                        backdrop-blur-xl backdrop-saturate-150
                        text-white text-xs font-black px-3 py-1.5 sm:px-4 sm:py-2 
                        rounded-full shadow-[0_8px_32px_rgba(239,68,68,0.4)]
                        border border-red-400/60
                        transform transition-all duration-300
                        group-hover:scale-110 group-hover:shadow-[0_12px_40px_rgba(239,68,68,0.6)]
                        animate-[pulse_2s_ease-in-out_infinite]">
            -{produto.desconto}%
          </div>
        )}
        
        {/* Container da imagem com efeitos avançados */}
        <div className="relative w-full h-full flex items-center justify-center 
                        perspective-1000">
          
          {/* Loading state melhorado */}
          {!imagemCarregada && (
            <div className="absolute inset-0 flex items-center justify-center z-10
                          bg-gradient-to-br from-neutral-100/80 via-dourado-50/60 to-creme-100/60
                          dark:from-zinc-900/80 dark:via-zinc-800/60 dark:to-zinc-700/60
                          backdrop-blur-sm">
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-dourado-200/50 
                              border-t-dourado-600 rounded-full animate-spin" />
                <div className="absolute inset-0 w-14 h-14 sm:w-16 sm:h-16 border-4 border-transparent 
                              border-r-dourado-400/30 rounded-full animate-spin-reverse" />
              </div>
            </div>
          )}
          
          {/* Container da imagem com transformações 3D */}
          <div className="relative w-full h-full flex items-center justify-center 
                          p-2 sm:p-3 md:p-4
                          transform transition-all duration-700 ease-out
                          group-hover:scale-[1.02]">
            
            {/* Imagem com filtros avançados e efeitos */}
            <div className="relative w-full h-full 
                            filter-burger-image
                            group-hover:brightness-110 group-hover:contrast-105 
                            transition-all duration-700">
              {temImagemValida ? (
                <Image
                  src={urlImagem}
                  alt={produto.nome}
                  fill
                  priority={false}
                  className={`object-cover transition-all duration-700 ease-out
                            ${imagemCarregada ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                            group-hover:scale-[1.08]
                            drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]
                            group-hover:drop-shadow-[0_30px_70px_rgba(0,0,0,0.4)]`}
                  onLoad={() => setImagemCarregada(true)}
                  onError={() => setErroImagem(true)}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  style={{
                    objectPosition: 'center 45%',
                    filter: isHovered 
                      ? 'brightness(1.08) contrast(1.06) saturate(1.12)' 
                      : 'brightness(1.02) contrast(1.02) saturate(1.05)',
                    transition: 'filter 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center 
                              bg-gradient-to-br from-zinc-100 to-zinc-200 
                              dark:from-zinc-800 dark:to-zinc-900">
                  <ImageIcon className="w-16 h-16 text-zinc-400 dark:text-zinc-600" />
                </div>
              )}
            </div>
            
            {/* Overlay de brilho radial dinâmico */}
            <div className={`absolute inset-0 
                            bg-gradient-radial from-white/0 via-white/0 to-transparent
                            dark:from-white/0 dark:via-white/0
                            opacity-0 group-hover:opacity-100
                            transition-opacity duration-700
                            pointer-events-none
                            ${isHovered ? 'animate-shimmer-glow' : ''}`} />
            
            {/* Overlay de profundidade com gradiente radial */}
            <div className="absolute inset-0 
                          bg-gradient-radial from-transparent via-transparent to-black/20
                          dark:to-black/40
                          opacity-0 group-hover:opacity-100
                          transition-opacity duration-700
                          pointer-events-none" />
            
            {/* Efeito de brilho superior */}
            <div className="absolute top-0 left-0 right-0 h-1/3
                          bg-gradient-to-b from-white/10 via-white/5 to-transparent
                          dark:from-white/5 dark:via-white/2
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
                        bg-gradient-to-r from-transparent via-dourado-200/20 to-transparent
                        dark:via-dourado-900/20
                        opacity-0 group-hover:opacity-100
                        transform -skew-x-12 -translate-x-full group-hover:translate-x-full
                        transition-all duration-1000 ease-in-out
                        pointer-events-none
                        blur-xl" />
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

