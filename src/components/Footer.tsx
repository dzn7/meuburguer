'use client'

import { Home, ShoppingCart } from 'lucide-react'
import { useCarrinho } from '@/contexts/CarrinhoContext'

type FooterProps = {
  onAbrirCarrinho: () => void
}

export default function Footer({ onAbrirCarrinho }: FooterProps) {
  const { quantidadeTotal } = useCarrinho()

  const scrollParaInicio = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 shadow-2xl border-t border-gray-200 dark:border-gray-800 z-40">
      <div className="container mx-auto">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={scrollParaInicio}
            className="flex flex-col items-center justify-center w-full h-full text-dourado-600 dark:text-dourado-500 
                     hover:bg-dourado-50 dark:hover:bg-dourado-950/20 transition-all duration-300"
            aria-label="Ir para o início"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">Início</span>
          </button>

          <button
            onClick={onAbrirCarrinho}
            className="flex flex-col items-center justify-center w-full h-full text-gray-700 dark:text-gray-300 
                     hover:bg-dourado-50 dark:hover:bg-dourado-950/20 hover:text-dourado-600 dark:hover:text-dourado-500
                     transition-all duration-300 relative"
            aria-label="Abrir carrinho"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              {quantidadeTotal > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-dourado-600 to-dourado-500 
                               text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center
                               animate-pulse-glow">
                  {quantidadeTotal}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 font-medium">Carrinho</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

