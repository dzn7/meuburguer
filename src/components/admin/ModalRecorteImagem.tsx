'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Maximize2,
  Square,
  Loader2,
} from 'lucide-react'
import {
  obterImagemRecortada,
  blobParaBase64,
  type AreaRecorte,
} from '@/lib/recorteImagem'

// Importação dinâmica do Cropper para evitar problemas de SSR
const Cropper = dynamic(
  () => import('react-easy-crop').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    )
  }
)

// Tipos do react-easy-crop
type Point = { x: number; y: number }
type Area = { x: number; y: number; width: number; height: number }

type ProporcoesPreset = {
  nome: string
  valor: number
  icone: React.ReactNode
}

type ModalRecorteImagemProps = {
  aberto: boolean
  imagemUrl: string
  onFechar: () => void
  onConfirmar: (imagemRecortadaBase64: string, blob: Blob) => void
  proporcaoInicial?: number
  titulo?: string
}

const PROPORCOES_PRESET: ProporcoesPreset[] = [
  { nome: 'Livre', valor: 0, icone: <Maximize2 className="w-4 h-4" /> },
  { nome: '1:1', valor: 1, icone: <Square className="w-4 h-4" /> },
  { nome: '4:3', valor: 4 / 3, icone: <ImageIcon className="w-4 h-4" /> },
  { nome: '16:9', valor: 16 / 9, icone: <ImageIcon className="w-4 h-4" /> },
  { nome: '3:4', valor: 3 / 4, icone: <ImageIcon className="w-4 h-4" /> },
]

export default function ModalRecorteImagem({
  aberto,
  imagemUrl,
  onFechar,
  onConfirmar,
  proporcaoInicial = 1,
  titulo = 'Ajustar Imagem',
}: ModalRecorteImagemProps) {
  // Estados do cropper
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotacao, setRotacao] = useState(0)
  const [areaRecortada, setAreaRecortada] = useState<AreaRecorte | null>(null)
  const [proporcao, setProporcao] = useState(proporcaoInicial)
  const [flip, setFlip] = useState({ horizontal: false, vertical: false })

  // Estados de UI
  const [processando, setProcessando] = useState(false)
  const [erroProcessamento, setErroProcessamento] = useState<string | null>(null)

  // Referência para controle de zoom via slider
  const zoomMinimo = 1
  const zoomMaximo = 3

  const aoCompletarRecorte = useCallback(
    (_areaCortada: Area, areaPixels: Area) => {
      setAreaRecortada(areaPixels)
    },
    []
  )

  const resetarAjustes = useCallback(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotacao(0)
    setFlip({ horizontal: false, vertical: false })
    setProporcao(proporcaoInicial)
    setErroProcessamento(null)
  }, [proporcaoInicial])

  const rotacionarEsquerda = useCallback(() => {
    setRotacao((prev) => (prev - 90) % 360)
  }, [])

  const rotacionarDireita = useCallback(() => {
    setRotacao((prev) => (prev + 90) % 360)
  }, [])

  const inverterHorizontal = useCallback(() => {
    setFlip((prev) => ({ ...prev, horizontal: !prev.horizontal }))
  }, [])

  const inverterVertical = useCallback(() => {
    setFlip((prev) => ({ ...prev, vertical: !prev.vertical }))
  }, [])

  const aumentarZoom = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, zoomMaximo))
  }, [])

  const diminuirZoom = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, zoomMinimo))
  }, [])

  const confirmarRecorte = async () => {
    if (!areaRecortada) {
      setErroProcessamento('Selecione uma área para recortar')
      return
    }

    setProcessando(true)
    setErroProcessamento(null)

    try {
      const blobRecortado = await obterImagemRecortada(
        imagemUrl,
        areaRecortada,
        rotacao,
        flip
      )

      if (!blobRecortado) {
        throw new Error('Falha ao processar a imagem')
      }

      const base64 = await blobParaBase64(blobRecortado)
      onConfirmar(base64, blobRecortado)
      resetarAjustes()
    } catch (erro) {
      console.error('Erro ao recortar imagem:', erro)
      setErroProcessamento('Não foi possível processar a imagem. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const fecharModal = () => {
    resetarAjustes()
    onFechar()
  }

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={fecharModal}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl 
                     w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {titulo}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Arraste para posicionar, use os controles para ajustar
                  </p>
                </div>
              </div>
              <button
                onClick={fecharModal}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Área do Cropper */}
            <div className="relative flex-1 min-h-[300px] md:min-h-[400px] bg-zinc-950">
              {/* @ts-expect-error - Dynamic import typing issue */}
              <Cropper
                image={imagemUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotacao}
                aspect={proporcao === 0 ? 4/3 : proporcao}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={aoCompletarRecorte}
                cropShape="rect"
                showGrid={true}
                style={{
                  containerStyle: {
                    backgroundColor: '#09090b',
                  },
                  cropAreaStyle: {
                    border: '2px solid #ca8a04',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                  },
                }}
              />
            </div>

            {/* Controles */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              {/* Proporções */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mr-2">
                  Proporção:
                </span>
                {PROPORCOES_PRESET.map((preset) => (
                  <button
                    key={preset.nome}
                    onClick={() => setProporcao(preset.valor)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg 
                             transition-all ${
                               proporcao === preset.valor
                                 ? 'bg-amber-600 text-white'
                                 : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                             }`}
                  >
                    {preset.icone}
                    {preset.nome}
                  </button>
                ))}
              </div>

              {/* Controles de Zoom */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 min-w-[50px]">
                  Zoom:
                </span>
                <button
                  onClick={diminuirZoom}
                  disabled={zoom <= zoomMinimo}
                  className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 
                           dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  aria-label="Diminuir zoom"
                >
                  <ZoomOut className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                </button>
                <input
                  type="range"
                  min={zoomMinimo}
                  max={zoomMaximo}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none 
                           cursor-pointer accent-amber-600"
                  aria-label="Controle de zoom"
                />
                <button
                  onClick={aumentarZoom}
                  disabled={zoom >= zoomMaximo}
                  className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 
                           dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  aria-label="Aumentar zoom"
                >
                  <ZoomIn className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                </button>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 min-w-[40px] text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Controles de Rotação e Flip */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mr-2">
                    Rotação:
                  </span>
                  <button
                    onClick={rotacionarEsquerda}
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 
                             dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Rotacionar para esquerda"
                    title="Rotacionar 90° para esquerda"
                  >
                    <RotateCcw className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  </button>
                  <button
                    onClick={rotacionarDireita}
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 
                             dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Rotacionar para direita"
                    title="Rotacionar 90° para direita"
                  >
                    <RotateCw className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  </button>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                    {rotacao}°
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mr-2">
                    Espelhar:
                  </span>
                  <button
                    onClick={inverterHorizontal}
                    className={`p-2 rounded-lg transition-colors ${
                      flip.horizontal
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    aria-label="Espelhar horizontalmente"
                    title="Espelhar horizontalmente"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={inverterVertical}
                    className={`p-2 rounded-lg transition-colors ${
                      flip.vertical
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    aria-label="Espelhar verticalmente"
                    title="Espelhar verticalmente"
                  >
                    <FlipVertical className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={resetarAjustes}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium 
                           bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 
                           rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resetar
                </button>
              </div>

              {/* Mensagem de erro */}
              {erroProcessamento && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                              rounded-lg text-sm text-red-600 dark:text-red-400">
                  {erroProcessamento}
                </div>
              )}
            </div>

            {/* Rodapé com botões de ação */}
            <div className="flex items-center justify-end gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 
                          border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={fecharModal}
                disabled={processando}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 
                         bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 
                         rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors
                         disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRecorte}
                disabled={processando || !areaRecortada}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white 
                         bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Aplicar Recorte
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
