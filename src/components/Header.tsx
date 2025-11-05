'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import Image from 'next/image'

export default function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!mounted) return null

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/98 dark:bg-zinc-950/98 backdrop-blur-md shadow-lg'
          : 'bg-white dark:bg-zinc-950 shadow-sm'
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              {/* Glow effect atrás do logo */}
              <div className="absolute inset-0 bg-dourado-400/20 dark:bg-dourado-500/20 rounded-full blur-xl 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150" />
              
              <div className="relative w-12 h-12 md:w-14 md:h-14 transform transition-all duration-300 
                            group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/assets/meuburger.png"
                  alt="Meu Burguer"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain drop-shadow-lg
                           group-hover:drop-shadow-2xl transition-all duration-300"
                  priority
                  style={{
                    filter: 'drop-shadow(0 4px 12px rgba(202, 138, 4, 0.3))',
                  }}
                />
              </div>
            </div>
            
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-3xl font-bold relative">
                <span className="relative inline-block logo-text 
                               transform transition-all duration-300 
                               group-hover:scale-105">
                  Meu Burguer
                </span>
              </h1>
              <span className="text-[10px] md:text-xs text-dourado-600 dark:text-dourado-500 
                             font-semibold tracking-wider uppercase opacity-80">
                Sabor Artesanal
              </span>
            </div>
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 md:p-3 rounded-xl bg-gray-100 dark:bg-gray-800 
                     hover:bg-gradient-to-br hover:from-dourado-100 hover:to-dourado-50
                     dark:hover:from-dourado-950/30 dark:hover:to-dourado-900/20
                     transition-all duration-300 hover:shadow-lg hover:scale-105
                     border border-transparent hover:border-dourado-200 dark:hover:border-dourado-800"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-dourado-600 dark:text-dourado-400 
                           transform transition-transform duration-300 hover:rotate-180" />
            ) : (
              <Moon className="w-5 h-5 text-dourado-700 
                            transform transition-transform duration-300 hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

