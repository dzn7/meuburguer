import type { Funcionario } from './tipos-caixa'

export type StatusEntrega = 'pendente' | 'em_rota' | 'entregue' | 'cancelada'

export type Entrega = {
  id: string
  pedido_id: string
  entregador_id: string | null
  status: StatusEntrega
  endereco_entrega: string | null
  bairro: string | null
  taxa_entrega: number
  tempo_estimado: number | null
  tempo_real: number | null
  distancia_km: number | null
  observacoes: string | null
  data_saida: string | null
  data_entrega: string | null
  created_at: string
  updated_at: string
  // Joins
  entregador?: Funcionario
  pedido?: {
    id: string
    nome_cliente: string
    telefone: string
    total: number
    forma_pagamento: string
    status: string
    tipo_entrega: string
    endereco: string
  }
}

export type NovaEntrega = {
  pedido_id: string
  entregador_id?: string
  endereco_entrega?: string
  bairro?: string
  taxa_entrega?: number
  tempo_estimado?: number
  distancia_km?: number
  observacoes?: string
}

export type EstatisticasEntregas = {
  totalEntregas: number
  entregasPendentes: number
  entregasEmRota: number
  entregasConcluidas: number
  entregasCanceladas: number
  tempoMedioEntrega: number
  taxaMediaEntrega: number
  totalTaxas: number
}
