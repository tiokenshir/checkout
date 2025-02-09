import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-primepag-signature',
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

    // Get PrimePag settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('payment_settings')
      .single()

    if (settingsError) throw settingsError

    // Verify PrimePag signature
    const signature = req.headers.get('x-primepag-signature')
    if (!signature) {
      throw new Error('Missing PrimePag signature')
    }

    const payload = await req.text()
    const isValid = await validateSignature(
      signature,
      payload,
      settings.payment_settings.webhook_secret
    )

    if (!isValid) {
      throw new Error('Invalid signature')
    }

    const data = JSON.parse(payload)
    const {
      id: transactionId,
      external_id: orderId,
      status,
      paid_at,
      amount,
      payment_method,
    } = data

    // Validate required fields
    if (!orderId || !status || !transactionId) {
      throw new Error('Missing required fields')
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError

    // Update order status
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        status: status === 'paid' ? 'paid' : 'expired',
        paid_at: paid_at,
        transaction_id: transactionId,
        payment_method: payment_method,
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    // Create notification
    const { error: notifyError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: order.customer_id,
        type: 'payment',
        title: status === 'paid' ? 'Pagamento Confirmado' : 'Pagamento Expirado',
        content: status === 'paid'
          ? `Seu pagamento de R$ ${amount.toFixed(2)} foi confirmado`
          : 'Seu pagamento expirou',
        data: {
          order_id: orderId,
          amount,
          status,
        },
      })

    if (notifyError) throw notifyError

    // Send email notification
    if (status === 'paid') {
      await supabaseClient.functions.invoke('send-email', {
        body: {
          to: order.customers.email,
          template: 'payment_received',
          data: {
            customerName: order.customers.name,
            orderId: order.id,
            amount: order.total_amount,
            paymentMethod: payment_method,
          },
        },
      })
    }

    // Send WhatsApp notification if enabled
    if (settings.whatsapp_settings?.enabled) {
      const template = status === 'paid'
        ? settings.whatsapp_settings.templates.payment_received
        : settings.whatsapp_settings.templates.payment_expired

      const message = template
        .replace('{customer_name}', order.customers.name)
        .replace('{order_id}', order.id)
        .replace('{amount}', amount.toFixed(2))

      await sendWhatsAppMessage(
        order.customers.phone,
        message,
        settings.whatsapp_settings
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)

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

// Validate PrimePag signature
async function validateSignature(signature: string, payload: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  )

  const hexSignature = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signature === hexSignature
}

// Send WhatsApp message
async function sendWhatsAppMessage(
  phone: string,
  message: string,
  settings: any
): Promise<void> {
  try {
    const response = await fetch(`${settings.api_url}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send WhatsApp message')
    }
  } catch (error) {
    console.error('WhatsApp error:', error)
    // Don't throw error to avoid webhook failure
  }
}