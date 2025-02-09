import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

type ReportType = 'sales' | 'products' | 'customers' | 'access'

type ReportOptions = {
  startDate: Date
  endDate: Date
  format: 'pdf' | 'excel'
  includeCharts?: boolean
  includeTables?: boolean
}

export async function generateReport(type: ReportType, options: ReportOptions): Promise<string> {
  try {
    // Buscar dados para o relatório
    const data = await fetchReportData(type, options)

    // Gerar relatório no formato escolhido
    if (options.format === 'pdf') {
      return generatePDFReport(type, data, options)
    } else {
      return generateExcelReport(type, data, options)
    }
  } catch (error) {
    console.error('Error generating report:', error)
    throw error
  }
}

async function fetchReportData(type: ReportType, options: ReportOptions) {
  const { startDate, endDate } = options

  switch (type) {
    case 'sales':
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          products (*)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Calcular métricas
      const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0)
      const totalOrders = orders.length
      const paidOrders = orders.filter(order => order.status === 'paid')
      const conversionRate = (paidOrders.length / totalOrders) * 100

      // Agrupar por dia
      const salesByDay = orders.reduce((acc, order) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd')
        if (!acc[date]) {
          acc[date] = {
            date,
            total: 0,
            count: 0,
            paid: 0,
          }
        }
        acc[date].total += order.total_amount
        acc[date].count++
        if (order.status === 'paid') {
          acc[date].paid++
        }
        return acc
      }, {} as Record<string, any>)

      return {
        orders,
        metrics: {
          totalSales,
          totalOrders,
          paidOrders: paidOrders.length,
          conversionRate,
          averageTicket: totalSales / totalOrders,
        },
        salesByDay: Object.values(salesByDay),
      }

    case 'products':
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select()
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      // Buscar vendas por produto
      const { data: productOrders, error: productOrdersError } = await supabase
        .from('orders')
        .select(`
          *,
          products (*)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (productOrdersError) throw productOrdersError

      // Calcular métricas por produto
      const productMetrics = productOrders.reduce((acc, order) => {
        const productId = order.product_id
        if (!acc[productId]) {
          acc[productId] = {
            id: productId,
            name: order.products.name,
            sales: 0,
            revenue: 0,
            orders: 0,
          }
        }
        acc[productId].sales++
        acc[productId].revenue += order.total_amount
        acc[productId].orders++
        return acc
      }, {} as Record<string, any>)

      return {
        products,
        metrics: Object.values(productMetrics),
      }

    case 'customers':
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          orders (*)
        `)
        .order('created_at', { ascending: false })

      if (customersError) throw customersError

      // Calcular métricas por cliente
      const customerMetrics = customers.reduce((acc, customer) => {
        const orders = customer.orders || []
        const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0)
        return {
          ...acc,
          [customer.id]: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            orders: orders.length,
            totalSpent,
            averageTicket: totalSpent / (orders.length || 1),
          },
        }
      }, {} as Record<string, any>)

      return {
        customers,
        metrics: Object.values(customerMetrics),
      }

    case 'access':
      const { data: accessLogs, error: accessError } = await supabase
        .from('access_logs')
        .select(`
          *,
          customers (*),
          drive_files (*)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (accessError) throw accessError

      return {
        logs: accessLogs,
        metrics: {
          totalAccesses: accessLogs.length,
          uniqueUsers: new Set(accessLogs.map(log => log.customer_id)).size,
          uniqueFiles: new Set(accessLogs.map(log => log.file_id)).size,
        },
      }

    default:
      throw new Error('Invalid report type')
  }
}

function generatePDFReport(type: ReportType, data: any, options: ReportOptions): string {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = margin

  // Helper functions
  const addTitle = (text: string) => {
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor
    const x = (pageWidth - textWidth) / 2
    doc.text(text, x, y)
    y += 15
  }

  const addSubtitle = (text: string) => {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 10
  }

  const addText = (text: string) => {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(text, margin, y)
    y += 7
  }

  const addSpacer = () => {
    y += 10
  }

  // Header
  addTitle(`Relatório de ${type === 'sales' ? 'Vendas' :
                          type === 'products' ? 'Produtos' :
                          type === 'customers' ? 'Clientes' :
                          'Acessos'}`)
  addText(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`)
  addText(`Período: ${format(options.startDate, 'dd/MM/yyyy')} a ${format(options.endDate, 'dd/MM/yyyy')}`)
  addSpacer()

  // Content based on report type
  switch (type) {
    case 'sales':
      // Métricas gerais
      addSubtitle('Métricas Gerais')
      addText(`Total em Vendas: R$ ${data.metrics.totalSales.toFixed(2)}`)
      addText(`Total de Pedidos: ${data.metrics.totalOrders}`)
      addText(`Pedidos Pagos: ${data.metrics.paidOrders}`)
      addText(`Taxa de Conversão: ${data.metrics.conversionRate.toFixed(1)}%`)
      addText(`Ticket Médio: R$ ${data.metrics.averageTicket.toFixed(2)}`)
      addSpacer()

      // Vendas por dia
      if (data.salesByDay.length > 0) {
        addSubtitle('Vendas por Dia')
        data.salesByDay.forEach((day: any) => {
          addText(`${format(new Date(day.date), 'dd/MM/yyyy')}: R$ ${day.total.toFixed(2)} (${day.count} pedidos)`)
        })
      }
      break

    case 'products':
      // Top produtos
      addSubtitle('Top Produtos')
      data.metrics
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10)
        .forEach((product: any) => {
          addText(`${product.name}:`)
          addText(`  Vendas: ${product.sales}`)
          addText(`  Receita: R$ ${product.revenue.toFixed(2)}`)
          addText(`  Ticket Médio: R$ ${(product.revenue / product.sales).toFixed(2)}`)
          y += 3
        })
      break

    case 'customers':
      // Top clientes
      addSubtitle('Top Clientes')
      data.metrics
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .forEach((customer: any) => {
          addText(`${customer.name}:`)
          addText(`  Pedidos: ${customer.orders}`)
          addText(`  Total Gasto: R$ ${customer.totalSpent.toFixed(2)}`)
          addText(`  Ticket Médio: R$ ${customer.averageTicket.toFixed(2)}`)
          y += 3
        })
      break

    case 'access':
      // Métricas de acesso
      addSubtitle('Métricas de Acesso')
      addText(`Total de Acessos: ${data.metrics.totalAccesses}`)
      addText(`Usuários Únicos: ${data.metrics.uniqueUsers}`)
      addText(`Arquivos Acessados: ${data.metrics.uniqueFiles}`)
      addSpacer()

      // Logs recentes
      addSubtitle('Logs Recentes')
      data.logs.slice(0, 10).forEach((log: any) => {
        addText(`${format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}:`)
        addText(`  Usuário: ${log.customers.name}`)
        addText(`  Arquivo: ${log.drive_files.name}`)
        addText(`  Ação: ${log.action}`)
        y += 3
      })
      break
  }

  // Footer
  doc.setFontSize(10)
  doc.setTextColor(128)
  const footer = 'Relatório gerado automaticamente'
  const footerWidth = doc.getStringUnitWidth(footer) * doc.internal.getFontSize() / doc.internal.scaleFactor
  doc.text(footer, (pageWidth - footerWidth) / 2, doc.internal.pageSize.getHeight() - margin)

  return doc.output('datauristring')
}

function generateExcelReport(type: ReportType, data: any, options: ReportOptions): string {
  // TODO: Implementar geração de Excel
  throw new Error('Excel report generation not implemented')
}

// Função auxiliar para exportar dados em CSV
export function exportToCSV(data: any[], filename: string): void {
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => 
        `"${String(row[header]).replace(/"/g, '""')}"`
      ).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`
  link.click()
}