import { supabase } from '../lib/supabase'

type WhatsAppTemplate = {
  name: string
  content: string
  variables: string[]
  category: 'order' | 'payment' | 'notification'
}

export async function setupWhatsApp(
  apiKey: string,
  instanceId: string,
  webhookUrl: string
) {
  try {
    const { error } = await supabase
      .from('settings')
      .update({
        whatsapp_settings: {
          enabled: true,
          api_key: apiKey,
          instance_id: instanceId,
          webhook_url: webhookUrl,
        },
      })
      .eq('id', 1) // Assumindo que existe um registro com ID 1

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error setting up WhatsApp:', error)
    throw error
  }
}

export async function sendWhatsAppMessage(
  to: string,
  template: string,
  data: Record<string, string>
) {
  try {
    const { error } = await supabase.functions.invoke('send-whatsapp', {
      body: { to, template, data },
    })

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    throw error
  }
}

export async function getWhatsAppLogs(
  options?: {
    status?: 'sent' | 'failed'
    startDate?: Date
    endDate?: Date
    phone?: string
  }
) {
  try {
    let query = supabase
      .from('whatsapp_logs')
      .select()
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString())
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString())
    }

    if (options?.phone) {
      query = query.ilike('to_phone', `%${options.phone}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting WhatsApp logs:', error)
    throw error
  }
}

export async function resendFailedMessages() {
  try {
    // Get failed messages from last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { data: failedLogs, error: logsError } = await supabase
      .from('whatsapp_logs')
      .select()
      .eq('status', 'failed')
      .gte('created_at', yesterday.toISOString())

    if (logsError) throw logsError

    // Attempt to resend each message
    const results = await Promise.allSettled(
      failedLogs.map(log =>
        sendWhatsAppMessage(log.to_phone, log.template, log.data)
      )
    )

    // Return summary
    return {
      total: failedLogs.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    }
  } catch (error) {
    console.error('Error resending failed messages:', error)
    throw error
  }
}