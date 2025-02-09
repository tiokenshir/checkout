import { supabase } from '../lib/supabase'

type AccessRequest = {
  order_id: string
  customer_id: string
  metadata?: Record<string, any>
}

export async function requestAccess(data: AccessRequest) {
  try {
    // Verificar se já existe uma solicitação pendente
    const { data: existingRequest, error: checkError } = await supabase
      .from('access_requests')
      .select()
      .eq('order_id', data.order_id)
      .eq('customer_id', data.customer_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') throw checkError
    
    if (existingRequest) {
      return { success: false, message: 'Já existe uma solicitação pendente' }
    }

    // Criar nova solicitação
    const { error } = await supabase
      .from('access_requests')
      .insert({
        ...data,
        status: 'pending',
      })

    if (error) throw error

    // Enviar notificação por WhatsApp
    await sendWhatsAppNotification(data.order_id, 'access_request')

    return { success: true }
  } catch (error) {
    console.error('Error requesting access:', error)
    throw error
  }
}

export async function approveAccess(requestId: string) {
  try {
    const { data: request, error: requestError } = await supabase
      .from('access_requests')
      .select(`
        *,
        orders (
          customer_id,
          customers (
            name,
            phone
          )
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError) throw requestError

    // Aprovar solicitação
    const { error: approveError } = await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: supabase.auth.user()?.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      })
      .eq('id', requestId)

    if (approveError) throw approveError

    // Enviar notificação por WhatsApp
    await sendWhatsAppNotification(request.order_id, 'access_approved', {
      customerName: request.orders.customers.name,
      customerPhone: request.orders.customers.phone,
    })

    return true
  } catch (error) {
    console.error('Error approving access:', error)
    throw error
  }
}

export async function rejectAccess(requestId: string, reason: string) {
  try {
    const { data: request, error: requestError } = await supabase
      .from('access_requests')
      .select(`
        *,
        orders (
          customer_id,
          customers (
            name,
            phone
          )
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError) throw requestError

    // Rejeitar solicitação
    const { error: rejectError } = await supabase
      .from('access_requests')
      .update({
        status: 'rejected',
        metadata: { reason },
      })
      .eq('id', requestId)

    if (rejectError) throw rejectError

    // Enviar notificação por WhatsApp
    await sendWhatsAppNotification(request.order_id, 'access_rejected', {
      customerName: request.orders.customers.name,
      customerPhone: request.orders.customers.phone,
      reason,
    })

    return true
  } catch (error) {
    console.error('Error rejecting access:', error)
    throw error
  }
}

export async function logAccess(requestId: string, fileId: string, action: 'view' | 'download') {
  try {
    const { error } = await supabase
      .from('access_logs')
      .insert({
        request_id: requestId,
        file_id: fileId,
        action,
        ip_address: window.location.hostname,
        user_agent: navigator.userAgent,
      })

    if (error) throw error
  } catch (error) {
    console.error('Error logging access:', error)
    throw error
  }
}

async function sendWhatsAppNotification(orderId: string, type: string, data?: Record<string, any>) {
  try {
    // Buscar configurações do WhatsApp
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('whatsapp_settings')
      .single()

    if (settingsError) throw settingsError
    if (!settings.whatsapp_settings?.enabled) return

    // Buscar template da mensagem
    const template = settings.whatsapp_settings.templates[type]
    if (!template) return

    // Buscar dados do pedido se necessário
    if (!data) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            name,
            phone
          ),
          products (
            name
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      data = {
        customerName: order.customers.name,
        customerPhone: order.customers.phone,
        productName: order.products.name,
        orderId: order.id,
      }
    }

    // Enviar mensagem
    const { error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        to: data.customerPhone,
        template: type,
        data,
      },
    })

    if (error) throw error
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error)
  }
}