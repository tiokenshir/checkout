import { supabase } from '../lib/supabase'
import { createNotification } from './notifications'

type PaymentData = {
  orderId: string
  amount: number
  description: string
  customer?: {
    name: string
    email: string
    document: string
  }
}

// For development/testing when PrimePag is not configured
function generateMockPayment(): { qrCode: string; paymentCode: string } {
  return {
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    paymentCode: '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000',
  }
}

async function getPaymentSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('payment_settings')
    .single()

  if (error) throw error
  return data.payment_settings
}

export async function generatePaymentQRCode(data: PaymentData): Promise<{
  qrCode: string
  paymentCode: string
}> {
  try {
    const settings = await getPaymentSettings()
    
    // If PrimePag is not configured, use mock data
    if (!settings?.primepag_token || process.env.NODE_ENV === 'development') {
      console.warn('Using mock payment data - PrimePag not configured')
      return generateMockPayment()
    }

    // Create charge in PrimePag
    const response = await fetch(`${settings.primepag_api_url}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.primepag_token}`,
      },
      body: JSON.stringify({
        amount: data.amount * 100, // PrimePag expects amount in cents
        currency: 'BRL',
        payment_method: 'pix',
        description: data.description,
        external_id: data.orderId,
        customer: data.customer,
        expiration: settings.auto_expire_time * 60, // Convert minutes to seconds
        callback_url: `${window.location.origin}/api/webhooks/primepag`,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create payment')
    }

    const result = await response.json()

    // Notify about new order
    await createNotification({
      type: 'order_status',
      title: 'Novo Pedido',
      content: `Novo pedido criado no valor de R$ ${data.amount.toFixed(2)}`,
      data: {
        orderId: data.orderId,
        amount: data.amount,
      },
    })

    return {
      qrCode: result.pix.qr_code,
      paymentCode: result.pix.code,
    }
  } catch (error) {
    console.error('Error generating payment:', error)
    // Fallback to mock data in case of error
    return generateMockPayment()
  }
}

export async function checkPaymentStatus(orderId: string): Promise<'pending' | 'paid' | 'expired'> {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError
    return order.status
  } catch (error) {
    console.error('Error checking payment status:', error)
    return 'pending'
  }
}

// Only for development environment
export async function simulatePayment(orderId: string): Promise<boolean> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Simulation only available in development')
  }

  try {
    // Get order details first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          name,
          email
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: `sim_${Date.now()}`,
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    // Create notification
    await createNotification({
      type: 'payment',
      title: 'Pagamento Confirmado',
      content: `Pagamento do pedido ${orderId} foi confirmado`,
      data: {
        orderId,
        amount: order.total_amount,
        customerName: order.customers.name,
        customerEmail: order.customers.email,
      },
    })

    return true
  } catch (error) {
    console.error('Error simulating payment:', error)
    throw error
  }
}