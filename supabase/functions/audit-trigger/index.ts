import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { table_name, record_id, action, old_data, new_data, user_id } = await req.json()

    // Registrar log de auditoria
    const { error } = await supabaseClient
      .from('audit_logs')
      .insert({
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        user_id,
      })

    if (error) throw error

    // Criar notificação se necessário
    if (table_name === 'orders' && action === 'UPDATE') {
      const oldStatus = old_data?.status
      const newStatus = new_data?.status

      if (oldStatus !== newStatus) {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id,
            type: 'order_status',
            title: 'Status do Pedido Atualizado',
            content: `O pedido ${record_id} mudou de ${oldStatus} para ${newStatus}`,
            data: { order_id: record_id },
          })
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})