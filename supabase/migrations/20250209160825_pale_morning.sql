/*
  # Atualizações do Sistema de Pagamento

  1. Novas Colunas
    - Adicionadas à tabela `orders`:
      - `payment_method` (text): Método de pagamento utilizado
      - `transaction_id` (text): ID da transação no provedor de pagamento
      - `paid_at` (timestamptz): Data e hora do pagamento

  2. Nova Tabela
    - `order_updates`: Para notificações em tempo real
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `order_id` (uuid, referência a orders)
      - `status` (text)
      - `transaction_id` (text)

  3. Segurança
    - RLS habilitado para a nova tabela
    - Políticas de acesso configuradas
*/

-- Adicionar novas colunas à tabela orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN transaction_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

-- Criar tabela de atualizações de pedidos
CREATE TABLE IF NOT EXISTS order_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  order_id uuid NOT NULL REFERENCES orders(id),
  status text NOT NULL CHECK (status IN ('paid', 'cancelled')),
  transaction_id text NOT NULL
);

-- Habilitar RLS
ALTER TABLE order_updates ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Allow authenticated read access to order_updates"
  ON order_updates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role insert to order_updates"
  ON order_updates
  FOR INSERT
  TO service_role
  WITH CHECK (true);