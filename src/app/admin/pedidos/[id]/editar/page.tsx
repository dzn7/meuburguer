'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  IconButton,
  CircularProgress,
} from '@mui/material'
import { ArrowBack, Save } from '@mui/icons-material'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'

type Pedido = {
  id: string
  nome_cliente: string
  telefone: string
  endereco?: string
  tipo_entrega: string
  status: string
  total: number
}

export default function EditarPedidoPage() {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string

  useEffect(() => {
    if (pedidoId) {
      carregarPedido()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId])

  const carregarPedido = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .single()

      if (error) throw error

      setPedido(data)
      setNomeCliente(data.nome_cliente)
      setTelefone(data.telefone)
      setEndereco(data.endereco || '')
      setTipoEntrega(data.tipo_entrega)
      setStatus(data.status)
    } catch (error) {
      console.error('Erro ao carregar pedido:', error)
    } finally {
      setLoading(false)
    }
  }

  const salvarAlteracoes = async () => {
    if (!nomeCliente || !telefone) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({
          nome_cliente: nomeCliente,
          telefone,
          endereco: endereco || null,
          tipo_entrega: tipoEntrega,
          status,
        })
        .eq('id', pedidoId)

      if (error) throw error

      router.push(`/admin/pedidos/${pedidoId}`)
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
      alert('Erro ao salvar alterações. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <Box className="flex justify-center items-center h-96">
            <CircularProgress className="text-dourado-600" />
          </Box>
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  if (!pedido) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <Box className="text-center py-12">
            <Typography variant="h6" className="text-gray-500 dark:text-gray-400">
              Pedido não encontrado
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/admin/pedidos')}
              className="mt-4 bg-dourado-600"
            >
              Voltar para Pedidos
            </Button>
          </Box>
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <Box>
          <Box className="flex items-center gap-4 mb-6">
            <IconButton onClick={() => router.back()} className="text-gray-900 dark:text-white">
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" className="font-bold text-gray-900 dark:text-white">
              Editar Pedido #{pedido.id.slice(0, 8).toUpperCase()}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card className="bg-white dark:bg-gray-900 shadow-lg">
                <CardContent>
                  <Typography variant="h6" className="font-bold mb-4">
                    Dados do Cliente
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nome do Cliente *"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Telefone *"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Endereço"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        label="Tipo de Pedido"
                        value={tipoEntrega}
                        onChange={(e) => setTipoEntrega(e.target.value)}
                      >
                        <MenuItem value="entrega">Entrega</MenuItem>
                        <MenuItem value="retirada">Retirada</MenuItem>
                        <MenuItem value="local">Consumir no Local</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        label="Status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <MenuItem value="Pendente">Pendente</MenuItem>
                        <MenuItem value="Em Preparo">Em Preparo</MenuItem>
                        <MenuItem value="Pronto">Pronto</MenuItem>
                        <MenuItem value="Entregue">Entregue</MenuItem>
                        <MenuItem value="Cancelado">Cancelado</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card className="bg-white dark:bg-gray-900 shadow-lg sticky top-4">
                <CardContent>
                  <Typography variant="h6" className="font-bold mb-4">
                    Ações
                  </Typography>
                  <Box className="space-y-3">
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={salvando ? <CircularProgress size={20} /> : <Save />}
                      onClick={salvarAlteracoes}
                      disabled={salvando}
                      className="bg-dourado-600 hover:bg-dourado-700"
                    >
                      {salvando ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={() => router.back()}
                      disabled={salvando}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                  </Box>

                  <Box className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <Typography variant="body2" className="text-blue-800 dark:text-blue-400">
                      <strong>Nota:</strong> Esta página permite editar apenas os dados do
                      cliente e o status do pedido. Os itens do pedido não podem ser
                      alterados após a criação.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </AdminLayout>
    </ProtectedRoute>
  )
}

