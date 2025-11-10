'use client'

import { useState, useEffect } from 'react'

const slides = [
  {
    id: 1,
    imagem: '/assets/hero/hero.webp',
    titulo: 'Sabor que conquista!',
    subtitulo: 'Hambúrgueres artesanais feitos com ingredientes selecionados',
  },
  {
    id: 2,
    imagem: '/assets/hero/hero2.webp',
    titulo: 'Qualidade em cada mordida',
    subtitulo: 'Peça agora e receba quentinho em sua casa',
  },
]

export default function HeroCarousel() {
  const [slideAtual, setSlideAtual] = useState(0)
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  useEffect(() => {
    if (!montado) return
    
    const timer = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % slides.length)
    }, 8000)

    return () => clearInterval(timer)
  }, [montado])

  const irParaSlide = (index: number) => {
    setSlideAtual(index)
  }

  return (
    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-dourado-100 to-creme-100 dark:from-zinc-900 dark:to-zinc-800">
      {montado && slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            index === slideAtual
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-105 z-0'
          }`}
        >
          <div className="relative w-full h-full">
            <img
              src={slide.imagem}
              alt={slide.titulo}
              className="w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            
            <div className="absolute inset-0 flex items-end justify-center pb-16 md:pb-20">
              <div className="text-center px-4 max-w-4xl">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 drop-shadow-2xl">
                  {slide.titulo}
                </h2>
                <p className="text-lg md:text-xl lg:text-2xl text-white/90 drop-shadow-lg">
                  {slide.subtitulo}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {montado && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => irParaSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === slideAtual
                  ? 'w-10 h-3 bg-dourado-500'
                  : 'w-3 h-3 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
