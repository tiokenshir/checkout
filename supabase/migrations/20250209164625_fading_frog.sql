/*
  # Create default settings

  1. Changes
    - Insert default settings for admin user
    - Set default values for payment, notification and integration settings

  2. Security
    - No changes to RLS policies
*/

-- Insert default settings for admin user
INSERT INTO settings (
  user_id,
  payment_settings,
  notification_settings,
  integration_settings
)
SELECT 
  id as user_id,
  jsonb_build_object(
    'pix_key', '',
    'pix_key_type', 'cpf',
    'auto_expire_time', 30,
    'allow_partial_payments', false,
    'min_installment_value', 10,
    'max_installments', 12
  ) as payment_settings,
  jsonb_build_object(
    'email_notifications', true,
    'payment_confirmation', true,
    'payment_expiration', true,
    'new_order', true,
    'daily_summary', false,
    'weekly_report', true
  ) as notification_settings,
  jsonb_build_object(
    'webhook_url', '',
    'api_key', gen_random_uuid(),
    'notification_url', '',
    'success_url', '',
    'cancel_url', ''
  ) as integration_settings
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM settings)
  AND raw_user_meta_data->>'role' = 'admin';