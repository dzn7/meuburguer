import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ItemPedido = {
  produto?: string
  nome_produto?: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  adicionais?: string
  observacoes?: string
}

type Pedido = {
  id: string
  nome_cliente: string
  telefone: string
  endereco?: string
  tipo_entrega: string
  status: string
  total: number
  created_at: string
  itens: ItemPedido[]
}

export function gerarPDFPedido(pedido: Pedido) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.setTextColor(184, 134, 11)
  doc.text('Meu Burguer', 105, 20, { align: 'center' })

  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text('Comprovante de Pedido', 105, 30, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Pedido #${pedido.id.slice(0, 8).toUpperCase()}`, 105, 38, { align: 'center' })
  doc.text(
    `Data: ${format(new Date(pedido.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    105,
    44,
    { align: 'center' }
  )

  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('Dados do Cliente', 14, 55)

  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(`Nome: ${pedido.nome_cliente}`, 14, 62)
  doc.text(`Telefone: ${pedido.telefone}`, 14, 68)
  if (pedido.endereco) {
    doc.text(`Endereço: ${pedido.endereco}`, 14, 74)
  }
  doc.text(`Tipo: ${pedido.tipo_entrega}`, 14, pedido.endereco ? 80 : 74)
  doc.text(`Status: ${pedido.status}`, 14, pedido.endereco ? 86 : 80)

  const startY = pedido.endereco ? 95 : 89

  const tableData = pedido.itens.map((item) => {
    const nomeProduto = item.produto || item.nome_produto || 'Produto'
    const rows: any[] = [
      [
        nomeProduto,
        item.quantidade.toString(),
        `R$ ${item.preco_unitario.toFixed(2)}`,
        `R$ ${item.subtotal.toFixed(2)}`,
      ],
    ]

    if (item.adicionais) {
      rows.push([{ content: `Adicionais: ${item.adicionais}`, colSpan: 4, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } }] as any)
    }

    if (item.observacoes) {
      rows.push([{ content: `Obs: ${item.observacoes}`, colSpan: 4, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } }] as any)
    }

    return rows
  }).flat()

  autoTable(doc, {
    startY,
    head: [['Produto', 'Qtd', 'Preço Un.', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [184, 134, 11],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: R$ ${pedido.total.toFixed(2)}`, 196, finalY, { align: 'right' })

  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'normal')
  doc.text('Obrigado pela preferência!', 105, finalY + 15, { align: 'center' })
  doc.text('Meu Burguer - Os melhores hambúrgueres da região', 105, finalY + 20, {
    align: 'center',
  })

  doc.save(`pedido-${pedido.id.slice(0, 8)}.pdf`)
}

