import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'
import { format } from 'https://esm.sh/date-fns@2.30.0'
import { ptBR } from 'https://esm.sh/date-fns@2.30.0/locale'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { scheduleId } = await req.json()

    // Buscar agendamento
    const { data: schedule, error: scheduleError } = await supabaseClient
      .from('report_schedules')
      .select()
      .eq('id', scheduleId)
      .single()

    if (scheduleError) throw scheduleError
    if (!schedule) throw new Error('Agendamento não encontrado')

    // Buscar dados para o relatório
    let reportData: any = {}
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Últimos 30 dias

    switch (schedule.type) {
      case 'sales':
        const { data: orders, error: ordersError } = await supabaseClient
          .from('orders')
          .select(`
            *,
            customers (*),
            products (*)
          `)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })

        if (ordersError) throw ordersError
        reportData = {
          orders,
          totalSales: orders.reduce((sum, order) => sum + order.total_amount, 0),
          totalOrders: orders.length,
          averageTicket: orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length,
          statusDistribution: orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1
            return acc
          }, {} as Record<string, number>),
        }
        break

      case 'products':
        const { data: products, error: productsError } = await supabaseClient
          .from('products')
          .select()
          .order('created_at', { ascending: false })

        if (productsError) throw productsError
        reportData = {
          products,
          totalProducts: products.length,
          activeProducts: products.filter(p => p.active).length,
          byType: products.reduce((acc, product) => {
            acc[product.type] = (acc[product.type] || 0) + 1
            return acc
          }, {} as Record<string, number>),
        }
        break

      case 'customers':
        const { data: customers, error: customersError } = await supabaseClient
          .from('customers')
          .select()
          .order('created_at', { ascending: false })

        if (customersError) throw customersError
        reportData = {
          customers,
          totalCustomers: customers.length,
          newCustomers: customers.filter(c => 
            new Date(c.created_at) >= startDate
          ).length,
        }
        break

      default:
        throw new Error('Tipo de relatório inválido')
    }

    // Gerar relatório
    let fileUrl: string
    if (schedule.format === 'pdf') {
      fileUrl = await generatePDF(schedule, reportData)
    } else {
      fileUrl = await generateExcel(schedule, reportData)
    }

    // Enviar emails
    for (const recipient of schedule.recipients) {
      await supabaseClient.functions.invoke('send-email', {
        body: {
          to: recipient,
          template: 'scheduled_report',
          data: {
            reportName: schedule.name,
            reportUrl: fileUrl,
          },
        },
      })
    }

    // Atualizar agendamento
    const { error: updateError } = await supabaseClient
      .from('report_schedules')
      .update({
        last_run: new Date().toISOString(),
        next_run: calculateNextRun(schedule.frequency),
      })
      .eq('id', schedule.id)

    if (updateError) throw updateError

    // Registrar log
    const { error: logError } = await supabaseClient
      .from('report_logs')
      .insert({
        schedule_id: schedule.id,
        status: 'success',
        recipients: schedule.recipients,
        file_url: fileUrl,
        metadata: {
          reportType: schedule.type,
          format: schedule.format,
          dataCount: Object.keys(reportData).length,
        },
      })

    if (logError) throw logError

    return new Response(
      JSON.stringify({ success: true, fileUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating report:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function calculateNextRun(frequency: string): string {
  const now = new Date()
  
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1)
      break
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
  }

  return now.toISOString()
}

async function generatePDF(schedule: any, data: any): Promise<string> {
  const doc = new jsPDF()
  let y = 20

  // Cabeçalho
  doc.setFontSize(20)
  doc.text(schedule.name, 20, y)
  y += 10

  doc.setFontSize(12)
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, y)
  y += 20

  // Conteúdo específico por tipo
  switch (schedule.type) {
    case 'sales':
      // Resumo
      doc.setFontSize(16)
      doc.text('Resumo de Vendas', 20, y)
      y += 10

      doc.setFontSize(12)
      doc.text(`Total em Vendas: R$ ${data.totalSales.toFixed(2)}`, 20, y)
      y += 7
      doc.text(`Total de Pedidos: ${data.totalOrders}`, 20, y)
      y += 7
      doc.text(`Ticket Médio: R$ ${data.averageTicket.toFixed(2)}`, 20, y)
      y += 20

      // Status
      doc.setFontSize(16)
      doc.text('Status dos Pedidos', 20, y)
      y += 10

      doc.setFontSize(12)
      Object.entries(data.statusDistribution).forEach(([status, count]) => {
        doc.text(`${status}: ${count}`, 20, y)
        y += 7
      })
      break

    case 'products':
      // Resumo
      doc.setFontSize(16)
      doc.text('Resumo de Produtos', 20, y)
      y += 10

      doc.setFontSize(12)
      doc.text(`Total de Produtos: ${data.totalProducts}`, 20, y)
      y += 7
      doc.text(`Produtos Ativos: ${data.activeProducts}`, 20, y)
      y += 20

      // Por Tipo
      doc.setFontSize(16)
      doc.text('Produtos por Tipo', 20, y)
      y += 10

      doc.setFontSize(12)
      Object.entries(data.byType).forEach(([type, count]) => {
        doc.text(`${type}: ${count}`, 20, y)
        y += 7
      })
      break

    case 'customers':
      // Resumo
      doc.setFontSize(16)
      doc.text('Resumo de Clientes', 20, y)
      y += 10

      doc.setFontSize(12)
      doc.text(`Total de Clientes: ${data.totalCustomers}`, 20, y)
      y += 7
      doc.text(`Novos Clientes (30 dias): ${data.newCustomers}`, 20, y)
      break
  }

  // Rodapé
  const pageCount = doc.internal.getNumberOfPages()
  doc.setFontSize(10)
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Upload do arquivo
  const pdfBytes = doc.output('arraybuffer')
  const fileName = `${schedule.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.pdf`
  
  const { data: upload, error: uploadError } = await supabaseClient.storage
    .from('reports')
    .upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      cacheControl: '3600',
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabaseClient.storage
    .from('reports')
    .getPublicUrl(fileName)

  return publicUrl
}

async function generateExcel(schedule: any, data: any): Promise<string> {
  // Implementar geração de Excel
  // Por simplicidade, estou retornando um erro
  throw new Error('Formato Excel ainda não implementado')
}