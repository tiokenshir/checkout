/*
  # Add WhatsApp settings

  1. Changes
    - Add whatsapp_settings JSONB column to settings table
    - Set default value for whatsapp_settings
  
  2. Notes
    - Maintains existing data
    - Adds new configuration options for WhatsApp integration
*/

-- Add whatsapp_settings column with default structure
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_settings JSONB DEFAULT jsonb_build_object(
  'enabled', false,
  'api_key', '',
  'instance_id', '',
  'webhook_url', '',
  'default_message', 'Olá {customer_name}, ',
  'notification_types', jsonb_build_object(
    'order_confirmation', true,
    'payment_received', true,
    'payment_expired', true,
    'access_granted', true
  ),
  'templates', jsonb_build_object(
    'order_confirmation', 'Olá {customer_name}, seu pedido #{order_id} foi confirmado! Valor: R$ {amount}',
    'payment_received', 'Olá {customer_name}, recebemos seu pagamento de R$ {amount} para o pedido #{order_id}',
    'payment_expired', 'Olá {customer_name}, o pagamento do pedido #{order_id} expirou. Gere um novo link para continuar.',
    'access_granted', 'Olá {customer_name}, seu acesso ao produto {product_name} foi liberado!'
  )
);