import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

const templates = {
  order_confirmation: {
    subject: 'Pedido Confirmado',
    body: (data: any) => `
      <h1>Pedido Confirmado!</h1>
      <p>Olá ${data.customerName},</p>
      <p>Seu pedido #${data.orderId} foi confirmado com sucesso.</p>
      <p>Detalhes do pedido:</p>
      <ul>
        <li>Produto: ${data.productName}</li>
        <li>Valor: R$ ${data.amount.toFixed(2)}</li>
        <li>Data: ${new Date(data.date).toLocaleDateString('pt-BR')}</li>
      </ul>
      <p>Obrigado pela sua compra!</p>
    `,
  },
  payment_received: {
    subject: 'Pagamento Recebido',
    body: (data: any) => `
      <h1>Pagamento Recebido!</h1>
      <p>Olá ${data.customerName},</p>
      <p>Recebemos o pagamento do seu pedido #${data.orderId}.</p>
      <p>Valor: R$ ${data.amount.toFixed(2)}</p>
      <p>Método: ${data.paymentMethod}</p>
      <p>Obrigado!</p>
    `,
  },
  payment_expired: {
    subject: 'Pagamento Expirado',
    body: (data: any) => `
      <h1>Pagamento Expirado</h1>
      <p>Olá ${data.customerName},</p>
      <p>O prazo para pagamento do seu pedido #${data.orderId} expirou.</p>
      <p>Para continuar com a compra, por favor, solicite um novo link de pagamento.</p>
    `,
  },
  daily_summary: {
    subject: 'Resumo Diário',
    body: (data: any) => `
      <h1>Resumo Diário</h1>
      <p>Aqui está o resumo das atividades de hoje:</p>
      <ul>
        <li>Novos pedidos: ${data.newOrders}</li>
        <li>Pagamentos confirmados: ${data.confirmedPayments}</li>
        <li>Valor total: R$ ${data.totalAmount.toFixed(2)}</li>
      </ul>
    `,
  },
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

    // Get email settings from environment variables
    const smtpClient = new SMTPClient({
      connection: {
        hostname: Deno.env.get('SMTP_HOST') ?? '',
        port: parseInt(Deno.env.get('SMTP_PORT') ?? '587'),
        tls: true,
        auth: {
          username: Deno.env.get('SMTP_USER') ?? '',
          password: Deno.env.get('SMTP_PASS') ?? '',
        },
      },
    })

    const { to, subject, template, data }: EmailPayload = await req.json()

    // Validate required fields
    if (!to || !template || !data) {
      throw new Error('Missing required fields')
    }

    // Get template
    const emailTemplate = templates[template]
    if (!emailTemplate) {
      throw new Error('Invalid template')
    }

    // Send email
    await smtpClient.send({
      from: Deno.env.get('SMTP_FROM') ?? '',
      to,
      subject: emailTemplate.subject,
      html: emailTemplate.body(data),
    })

    // Log email
    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert({
        to,
        template,
        data,
        status: 'sent',
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})