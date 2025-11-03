'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Produto, Adicional, ItemCarrinho } from '@/lib/supabase'

type CarrinhoContextType = {
  itens: ItemCarrinho[]
  adicionarItem: (produto: Produto, quantidade: number, adicionais: Adicional[], observacoes?: string) => void
  removerItem: (id: string) => void
  atualizarQuantidade: (id: string, quantidade: number) => void
  limparCarrinho: () => void
  total: number
  quantidadeTotal: number
}

const CarrinhoContext = createContext<CarrinhoContextType | undefined>(undefined)

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([])

  useEffect(() => {
    const carrinhoSalvo = localStorage.getItem('meu-burguer-carrinho')
    if (carrinhoSalvo) {
      try {
        setItens(JSON.parse(carrinhoSalvo))
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('meu-burguer-carrinho', JSON.stringify(itens))
  }, [itens])

  const adicionarItem = (
    produto: Produto,
    quantidade: number,
    adicionais: Adicional[],
    observacoes?: string
  ) => {
    const subtotalAdicionais = adicionais.reduce((acc, ad) => acc + ad.preco, 0)
    const subtotal = (produto.preco + subtotalAdicionais) * quantidade

    const novoItem: ItemCarrinho = {
      id: `${produto.id}-${Date.now()}`,
      produto,
      quantidade,
      adicionais,
      observacoes,
      subtotal,
    }

    setItens((prev) => [...prev, novoItem])
  }

  const removerItem = (id: string) => {
    setItens((prev) => prev.filter((item) => item.id !== id))
  }

  const atualizarQuantidade = (id: string, quantidade: number) => {
    if (quantidade <= 0) {
      removerItem(id)
      return
    }

    setItens((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const subtotalAdicionais = item.adicionais.reduce((acc, ad) => acc + ad.preco, 0)
          const subtotal = (item.produto.preco + subtotalAdicionais) * quantidade
          return { ...item, quantidade, subtotal }
        }
        return item
      })
    )
  }

  const limparCarrinho = () => {
    setItens([])
  }

  const total = itens.reduce((acc, item) => acc + item.subtotal, 0)
  const quantidadeTotal = itens.reduce((acc, item) => acc + item.quantidade, 0)

  return (
    <CarrinhoContext.Provider
      value={{
        itens,
        adicionarItem,
        removerItem,
        atualizarQuantidade,
        limparCarrinho,
        total,
        quantidadeTotal,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  )
}

export function useCarrinho() {
  const context = useContext(CarrinhoContext)
  if (context === undefined) {
    throw new Error('useCarrinho deve ser usado dentro de um CarrinhoProvider')
  }
  return context
}

