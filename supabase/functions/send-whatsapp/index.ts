import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Get WhatsApp settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('whatsapp_settings')
      .single()

    if (settingsError) throw settingsError
    if (!settings.whatsapp_settings.enabled) {
      throw new Error('WhatsApp notifications are disabled')
    }

    const { to, template, data } = await req.json()

    // Validate required fields
    if (!to || !template || !data) {
      throw new Error('Missing required fields')
    }

    // Get template message
    const templateMessage = settings.whatsapp_settings.templates[template]
    if (!templateMessage) {
      throw new Error('Invalid template')
    }

    // Replace variables in template
    let message = templateMessage
    Object.entries(data).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value as string)
    })

    // Send message via WhatsApp API
    const response = await fetch(`${settings.whatsapp_settings.api_url}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.whatsapp_settings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instance_id: settings.whatsapp_settings.instance_id,
        to,
        message,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send WhatsApp message')
    }

    // Log message
    const { error: logError } = await supabaseClient
      .from('whatsapp_logs')
      .insert({
        to_phone: to,
        template,
        data,
        status: 'sent',
        message_id: (await response.json()).message_id,
      })

    if (logError) throw logError

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('WhatsApp error:', error)

    // Log error
    if (error instanceof Error) {
      const { to, template, data } = await req.json()
      await supabaseClient
        .from('whatsapp_logs')
        .insert({
          to_phone: to,
          template,
          data,
          status: 'failed',
          error: error.message,
        })
    }

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