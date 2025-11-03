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
          ? 'bg-white/98 dark:bg-gray-950/98 backdrop-blur-md shadow-md'
          : 'bg-white dark:bg-gray-950 shadow-sm'
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/meuburger.png"
              alt="Meu Burguer"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
              priority
            />
            <h1 className="text-2xl md:text-3xl font-bold relative group">
              <span className="relative inline-block logo-text">
                Meu Burguer
              </span>
            </h1>
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-dourado-100 dark:hover:bg-dourado-950/30 
                     transition-all duration-300 hover:shadow-md"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-dourado-600 dark:text-dourado-500" />
            ) : (
              <Moon className="w-5 h-5 text-dourado-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

