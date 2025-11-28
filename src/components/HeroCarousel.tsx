'use client'

import { useState, useEffect, useRef } from 'react'

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
  {
    id: 3,
    imagem: '/assets/hero/hero3.webp',
    titulo: 'Experiência única!',
    subtitulo: 'Descubra o verdadeiro sabor do Meu Burguer!',
  },
  {
    id: 4,
    imagem: '/assets/hero/hero4.webp',
    titulo: 'Feito com amor!',
    subtitulo: 'Cada hambúrguer é preparado com carinho especial',
  },
  {
    id: 5,
    imagem: '/assets/hero/hero5.webp',
    titulo: 'Tradição e sabor!',
    subtitulo: 'O melhor hambúrguer da região está aqui',
  },
]

export default function HeroCarousel() {
  const [slideAtual, setSlideAtual] = useState(0)
  const [montado, setMontado] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const [posicaoInicial, setPosicaoInicial] = useState(0)
  const [posicaoAtual, setPosicaoAtual] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMontado(true)
  }, [])

  useEffect(() => {
    if (!montado) return
    
    const timer = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % slides.length)
    }, 5000) // 5 segundos

    return () => clearInterval(timer)
  }, [montado])

  const irParaSlide = (index: number) => {
    setSlideAtual(index)
  }

  const iniciarArraste = (posicaoX: number) => {
    setArrastando(true)
    setPosicaoInicial(posicaoX)
    setPosicaoAtual(posicaoX)
  }

  const duranteArraste = (posicaoX: number) => {
    if (!arrastando) return
    setPosicaoAtual(posicaoX)
  }

  const finalizarArraste = () => {
    if (!arrastando) return
    
    const diferenca = posicaoInicial - posicaoAtual
    const limiteMinimo = 50 // Sensibilidade do arraste
    
    if (Math.abs(diferenca) > limiteMinimo) {
      if (diferenca > 0) {
        // Arrastar para esquerda - próximo slide
        setSlideAtual((prev) => (prev + 1) % slides.length)
      } else {
        // Arrastar para direita - slide anterior
        setSlideAtual((prev) => (prev - 1 + slides.length) % slides.length)
      }
    }
    
    setArrastando(false)
    setPosicaoInicial(0)
    setPosicaoAtual(0)
  }

  // Handlers para mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    iniciarArraste(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    duranteArraste(e.clientX)
  }

  const handleMouseUp = () => {
    finalizarArraste()
  }

  const handleMouseLeave = () => {
    if (arrastando) {
      finalizarArraste()
    }
  }

  // Handlers para touch
  const handleTouchStart = (e: React.TouchEvent) => {
    iniciarArraste(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    duranteArraste(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    finalizarArraste()
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-dourado-100 to-creme-100 dark:from-zinc-900 dark:to-zinc-800 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
