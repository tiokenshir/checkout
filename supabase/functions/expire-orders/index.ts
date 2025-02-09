import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Atualizar pedidos expirados
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    if (updateError) throw updateError

    // Notificar sobre pedidos expirados
    const { data: expiredOrders, error: selectError } = await supabaseClient
      .from('orders')
      .select('id')
      .eq('status', 'expired')
      .gt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Últimos 5 minutos

    if (selectError) throw selectError

    // Enviar notificações
    for (const order of expiredOrders) {
      const { error: notifyError } = await supabaseClient
        .from('order_updates')
        .insert({
          order_id: order.id,
          status: 'expired',
          transaction_id: null,
        })

      if (notifyError) throw notifyError
    }

    return new Response(
      JSON.stringify({ success: true, expired: expiredOrders.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})