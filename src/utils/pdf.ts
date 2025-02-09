import { jsPDF } from 'jspdf'
import type { Database } from '../types/database.types'

type Order = Database['public']['Tables']['orders']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row']
  products: Database['public']['Tables']['products']['Row']
}

export function generateReceipt(order: Order): string {
  const doc = new jsPDF()
  
  // Configurações
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = margin

  // Funções auxiliares
  const centerText = (text: string, y: number) => {
    const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor
    const x = (pageWidth - textWidth) / 2
    doc.text(text, x, y)
  }

  const addLine = (text: string) => {
    doc.text(text, margin, y)
    y += 10
  }

  // Cabeçalho
  doc.setFontSize(20)
  centerText('Comprovante de Pagamento', y)
  y += 20

  // Informações do Pedido
  doc.setFontSize(12)
  addLine(`Pedido: ${order.id}`)
  addLine(`Data: ${new Date(order.created_at).toLocaleString()}`)
  y += 10

  // Informações do Cliente
  doc.setFontSize(14)
  addLine('Dados do Cliente')
  doc.setFontSize(12)
  addLine(`Nome: ${order.customers.name}`)
  addLine(`Email: ${order.customers.email}`)
  addLine(`CPF/CNPJ: ${order.customers.cpf}`)
  addLine(`Telefone: ${order.customers.phone}`)
  y += 10

  // Informações do Produto/Serviço
  doc.setFontSize(14)
  addLine(`${order.products.type === 'product' ? 'Produto' : 'Serviço'}`)
  doc.setFontSize(12)
  addLine(`Nome: ${order.products.name}`)
  addLine(`Descrição: ${order.products.description}`)
  y += 10

  // Informações do Pagamento
  doc.setFontSize(14)
  addLine('Pagamento')
  doc.setFontSize(12)
  addLine(`Valor: R$ ${order.total_amount.toFixed(2)}`)
  addLine(`Método: ${order.payment_method || 'PIX'}`)
  addLine(`ID da Transação: ${order.transaction_id}`)
  
  // QR Code (se disponível)
  if (order.payment_qr_code) {
    y += 10
    doc.addImage(order.payment_qr_code, 'PNG', margin, y, 50, 50)
    y += 60
  }

  // Rodapé
  const footer = 'Este é um documento digital gerado automaticamente.'
  doc.setFontSize(10)
  doc.setTextColor(128)
  centerText(footer, doc.internal.pageSize.getHeight() - margin)

  // Gerar PDF como base64
  return doc.output('datauristring')
}