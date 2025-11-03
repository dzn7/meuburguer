import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Produto = {
  id: string
  nome: string
  descricao: string
  preco: number
  preco_original?: number
  desconto?: number
  categoria: string
  imagem_url: string
  disponivel: boolean
  ordem: number
  destaque: boolean
  created_at: string
  updated_at: string
}

export type Adicional = {
  id: string
  nome: string
  preco: number
  imagem_url: string
  disponivel: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export type Bebida = {
  id: string
  nome: string
  preco: number
  preco_original?: number
  desconto?: number
  tamanho: string | null
  disponivel: boolean
  ordem: number
  imagem_url?: string
  created_at: string
  updated_at: string
}

export type ItemCarrinho = {
  id: string
  produto: Produto
  quantidade: number
  adicionais: Adicional[]
  observacoes?: string
  subtotal: number
}

export type Pedido = {
  id: string
  nome_cliente: string
  telefone?: string
  endereco?: string
  tipo_entrega: 'entrega' | 'retirada'
  forma_pagamento: string
  subtotal: number
  taxa_entrega: number
  total: number
  observacoes?: string
  status: 'pendente' | 'confirmado' | 'preparando' | 'pronto' | 'entregue' | 'cancelado'
  created_at: string
  updated_at: string
}

