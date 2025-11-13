'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Search } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HeroCarousel from '@/components/HeroCarousel'
import CartaoProduto from '@/components/CartaoProduto'
import CartaoBebida from '@/components/CartaoBebida'
import ModalComplementos from '@/components/ModalComplementos'
import ModalCarrinho from '@/components/ModalCarrinho'
import { Produto, Bebida, supabase } from '@/lib/supabase'

export default function Home() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [bebidas, setBebidas] = useState<Bebida[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [modalComplementosAberto, setModalComplementosAberto] = useState(false)
  const [modalCarrinhoAberto, setModalCarrinhoAberto] = useState(false)
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todos')
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    carregarProdutos()
    carregarBebidas()

    // Configurar realtime para produtos
    const channelProdutos = supabase
      .channel('produtos-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'produtos' },
        () => {
          carregarProdutos()
        }
      )
      .subscribe()

    // Configurar realtime para bebidas
    const channelBebidas = supabase
      .channel('bebidas-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bebidas' },
        () => {
          carregarBebidas()
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channelProdutos)
      supabase.removeChannel(channelBebidas)
    }
  }, [])

  const carregarProdutos = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('disponivel', true)
        .order('ordem', { ascending: true })

      if (error) throw error
      setProdutos(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setCarregando(false)
    }
  }

  const carregarBebidas = async () => {
    try {
      const { data, error } = await supabase
        .from('bebidas')
        .select('*')
        .eq('disponivel', true)
        .order('ordem', { ascending: true })

      if (error) throw error
      setBebidas(data || [])
    } catch (error) {
      console.error('Erro ao carregar bebidas:', error)
    }
  }

  const abrirModalComplementos = (produto: Produto) => {
    setProdutoSelecionado(produto)
    setModalComplementosAberto(true)
  }

  const categorias = ['Todos', ...Array.from(new Set(produtos.map((p) => p.categoria))), 'Bebidas']

  const produtosFiltrados =
    categoriaAtiva === 'Todos'
      ? produtos.filter((p) =>
          busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : true
        )
      : categoriaAtiva === 'Bebidas'
      ? []
      : produtos.filter(
          (p) =>
            p.categoria === categoriaAtiva &&
            (busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : true)
        )

  const bebidasFiltradas = 
    categoriaAtiva === 'Bebidas' || categoriaAtiva === 'Todos'
      ? bebidas.filter((b) =>
          busca ? b.nome.toLowerCase().includes(busca.toLowerCase()) : true
        )
      : []

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />

      <main className="pt-24 pb-24 relative">
        <section className="relative overflow-hidden bg-gradient-to-br from-creme-50 via-white to-dourado-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950 py-12 md:py-16">
          <div className="absolute inset-0 bg-burger-pattern opacity-[0.15] dark:opacity-[0.08]" />
          
          <div className="absolute inset-0 opacity-10 dark:opacity-[0.07]">
            <div className="absolute top-20 left-10 w-64 h-64 bg-dourado-400 dark:bg-dourado-600/40 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-creme-400 dark:bg-dourado-500/30 rounded-full blur-3xl animate-float-delayed" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-dourado-300/20 dark:bg-dourado-700/20 rounded-full blur-3xl animate-float-slow" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <HeroCarousel />
          </div>
        </section>

        <section id="cardapio" className="py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dourado-50/20 to-transparent dark:via-dourado-950/10" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-1 w-12 bg-gradient-to-r from-dourado-600 to-dourado-400 rounded-full" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-7 h-7 text-dourado-600 dark:text-dourado-500" />
                Nosso Cardápio
              </h2>
              <div className="h-1 flex-grow bg-gradient-to-r from-dourado-400 to-transparent rounded-full" />
            </div>

            <div className="mb-6 max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar hambúrguer ou bebida..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-full
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                           focus:border-dourado-500 focus:ring-2 focus:ring-dourado-200 dark:focus:ring-dourado-900
                           transition-all duration-300 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  onClick={() => setCategoriaAtiva(categoria)}
                  className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                    categoriaAtiva === categoria
                      ? 'bg-gradient-to-r from-dourado-600 to-dourado-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>

            {carregando ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-dourado-200 border-t-dourado-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Carregando cardápio...</p>
                </div>
              </div>
            ) : categoriaAtiva === 'Bebidas' ? (
              bebidasFiltradas.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    Nenhuma bebida encontrada
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {bebidasFiltradas.map((bebida) => (
                    <CartaoBebida key={bebida.id} bebida={bebida} />
                  ))}
                </div>
              )
            ) : categoriaAtiva === 'Todos' ? (
              produtosFiltrados.length === 0 && bebidasFiltradas.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    Nenhum produto encontrado
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {produtosFiltrados.length > 0 && (
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Hambúrgueres
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {produtosFiltrados.map((produto) => (
                          <CartaoProduto
                            key={produto.id}
                            produto={produto}
                            onAdicionar={abrirModalComplementos}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {bebidasFiltradas.length > 0 && (
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Bebidas
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {bebidasFiltradas.map((bebida) => (
                          <CartaoBebida key={bebida.id} bebida={bebida} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : produtosFiltrados.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Nenhum produto encontrado
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {produtosFiltrados.map((produto) => (
                  <CartaoProduto
                    key={produto.id}
                    produto={produto}
                    onAdicionar={abrirModalComplementos}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer onAbrirCarrinho={() => setModalCarrinhoAberto(true)} />

      <ModalComplementos
        produto={produtoSelecionado}
        aberto={modalComplementosAberto}
        onFechar={() => {
          setModalComplementosAberto(false)
          setProdutoSelecionado(null)
        }}
        onAbrirCarrinho={() => setModalCarrinhoAberto(true)}
      />

      <ModalCarrinho
        aberto={modalCarrinhoAberto}
        onFechar={() => setModalCarrinhoAberto(false)}
      />
    </div>
  )
}

