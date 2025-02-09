import { supabase } from '../lib/supabase'

type EmailTemplate = 'order_confirmation' | 'payment_received' | 'payment_expired' | 'access_granted' | 'daily_summary' | 'weekly_report'

type EmailData = {
  to: string
  template: EmailTemplate
  data: Record<string, any>
  cc?: string[]
  bcc?: string[]
}

export async function sendEmail(emailData: EmailData): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: emailData,
    })

    if (error) throw error
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

// Funções específicas para cada tipo de notificação
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        products (*)
      `)
      .eq('id', orderId)
      .single()

    if (error) throw error

    // Buscar configurações de notificação
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('notification_settings')
      .single()

    if (settingsError) throw settingsError

    await sendEmail({
      to: order.customers.email,
      template: 'order_confirmation',
      data: {
        customerName: order.customers.name,
        orderId: order.id,
        productName: order.products.name,
        amount: order.total_amount,
        date: order.created_at,
      },
      cc: settings.notification_settings.send_copy_to,
    })
  } catch (error) {
    console.error('Error sending order confirmation:', error)
    throw error
  }
}

export async function sendPaymentConfirmation(orderId: string): Promise<void> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        products (*)
      `)
      .eq('id', orderId)
      .single()

    if (error) throw error

    // Buscar configurações de notificação
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('notification_settings')
      .single()

    if (settingsError) throw settingsError

    await sendEmail({
      to: order.customers.email,
      template: 'payment_received',
      data: {
        customerName: order.customers.name,
        orderId: order.id,
        amount: order.total_amount,
        paymentMethod: order.payment_method || 'PIX',
        date: order.paid_at,
      },
      cc: settings.notification_settings.send_copy_to,
    })
  } catch (error) {
    console.error('Error sending payment confirmation:', error)
    throw error
  }
}

export async function sendPaymentExpiredNotification(orderId: string): Promise<void> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (*)
      `)
      .eq('id', orderId)
      .single()

    if (error) throw error

    // Buscar configurações de notificação
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('notification_settings')
      .single()

    if (settingsError) throw settingsError

    await sendEmail({
      to: order.customers.email,
      template: 'payment_expired',
      data: {
        customerName: order.customers.name,
        orderId: order.id,
        amount: order.total_amount,
      },
      cc: settings.notification_settings.send_copy_to,
    })
  } catch (error) {
    console.error('Error sending payment expired notification:', error)
    throw error
  }
}

export async function sendAccessGrantedNotification(orderId: string): Promise<void> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        products (*)
      `)
      .eq('id', orderId)
      .single()

    if (error) throw error

    // Buscar configurações de notificação
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('notification_settings')
      .single()

    if (settingsError) throw settingsError

    await sendEmail({
      to: order.customers.email,
      template: 'access_granted',
      data: {
        customerName: order.customers.name,
        orderId: order.id,
        productName: order.products.name,
      },
      cc: settings.notification_settings.send_copy_to,
    })
  } catch (error) {
    console.error('Error sending access granted notification:', error)
    throw error
  }
}

export async function sendDailySummary(userId: string): Promise<void> {
  try {
    // Buscar email do usuário
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError) throw userError

    // Buscar dados do dia
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select()
      .gte('created_at', today.toISOString())

    if (ordersError) throw ordersError

    const newOrders = orders.length
    const confirmedPayments = orders.filter(order => order.status === 'paid').length
    const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)

    await sendEmail({
      to: user.email,
      template: 'daily_summary',
      data: {
        date: today.toISOString(),
        newOrders,
        confirmedPayments,
        totalAmount,
        conversionRate: ((confirmedPayments / newOrders) * 100).toFixed(1),
      },
    })
  } catch (error) {
    console.error('Error sending daily summary:', error)
    throw error
  }
}

export async function sendWeeklyReport(userId: string): Promise<void> {
  try {
    // Buscar email do usuário
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError) throw userError

    // Buscar dados da semana
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    startDate.setHours(0, 0, 0, 0)

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        products (*)
      `)
      .gte('created_at', startDate.toISOString())

    if (ordersError) throw ordersError

    // Calcular métricas
    const totalOrders = orders.length
    const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)
    const paidOrders = orders.filter(order => order.status === 'paid')
    const conversionRate = ((paidOrders.length / totalOrders) * 100).toFixed(1)

    // Produtos mais vendidos
    const productSales = orders.reduce((acc, order) => {
      const existing = acc.find(p => p.id === order.product_id)
      if (existing) {
        existing.sales++
        existing.revenue += order.total_amount
      } else {
        acc.push({
          id: order.product_id,
          name: order.products.name,
          sales: 1,
          revenue: order.total_amount,
        })
      }
      return acc
    }, [] as any[])

    productSales.sort((a, b) => b.sales - a.sales)

    await sendEmail({
      to: user.email,
      template: 'weekly_report',
      data: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        totalOrders,
        totalAmount,
        paidOrders: paidOrders.length,
        conversionRate,
        topProducts: productSales.slice(0, 5),
      },
    })
  } catch (error) {
    console.error('Error sending weekly report:', error)
    throw error
  }
}