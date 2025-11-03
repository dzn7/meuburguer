'use client'

import { useState, useEffect } from 'react'
import { GlassWater, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Bebida, supabase } from '@/lib/supabase'
import { useCarrinho } from '@/contexts/CarrinhoContext'

type SugestaoBebidaProps = {
  mostrar: boolean
  onFechar: () => void
}

export default function SugestaoBebidas({ mostrar, onFechar }: SugestaoBebidaProps) {
  const [bebidas, setBebidas] = useState<Bebida[]>([])
  const [expandido, setExpandido] = useState(false)
  const { adicionarItem } = useCarrinho()

  useEffect(() => {
    if (mostrar) {
      carregarBebidas()
    }
  }, [mostrar])

  const carregarBebidas = async () => {
    try {
      const { data, error } = await supabase
        .from('bebidas')
        .select('*')
        .eq('disponivel', true)
        .order('ordem', { ascending: true })
        .limit(6)

      if (error) throw error
      setBebidas(data || [])
    } catch (error) {
      console.error('Erro ao carregar bebidas:', error)
    }
  }

  const adicionarBebida = (bebida: Bebida) => {
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
    onFechar()
  }

  if (!mostrar) return null

  return (
    <div className="bg-gradient-to-r from-dourado-50 to-creme-50 dark:from-dourado-950/20 dark:to-creme-950/20 
                    border-2 border-dourado-200 dark:border-dourado-800 rounded-xl overflow-hidden mb-6 animate-slideInDown relative">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setExpandido(!expandido)}
          className="flex items-center gap-2 flex-1 hover:opacity-80 transition-opacity"
        >
          <GlassWater className="w-5 h-5 text-dourado-600 dark:text-dourado-400" />
          <h4 className="font-bold text-gray-900 dark:text-white">
            Que tal uma bebida?
          </h4>
          {expandido ? (
            <ChevronUp className="w-5 h-5 text-dourado-600 dark:text-dourado-400 ml-auto" />
          ) : (
            <ChevronDown className="w-5 h-5 text-dourado-600 dark:text-dourado-400 ml-auto" />
          )}
        </button>
        
        <button
          onClick={onFechar}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Fechar sugestão"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {expandido && (
        <div className="px-4 pb-4 animate-slideInDown">

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Complete seu pedido com uma deliciosa bebida gelada!
          </p>

          <div className="grid grid-cols-2 gap-3">
        {bebidas.map((bebida) => (
          <button
            key={bebida.id}
            onClick={() => adicionarBebida(bebida)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                     rounded-lg p-3 hover:border-dourado-400 dark:hover:border-dourado-600 
                     hover:shadow-md transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-dourado-600 dark:group-hover:text-dourado-400 transition-colors">
                {bebida.nome}
              </span>
            </div>
            {bebida.tamanho && (
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-2">
                {bebida.tamanho}
              </span>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-dourado-600 dark:text-dourado-400">
                R$ {bebida.preco.toFixed(2)}
              </span>
              <span className="text-xs text-dourado-600 dark:text-dourado-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Adicionar →
              </span>
            </div>
          </button>
        ))}
      </div>

          {bebidas.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
              Carregando bebidas...
            </p>
          )}
        </div>
      )}
    </div>
  )
}

