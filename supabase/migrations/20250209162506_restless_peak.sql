/*
  # Corrigir políticas da tabela user_roles

  1. Alterações
    - Remove políticas existentes
    - Adiciona nova política para leitura pública
    - Adiciona política para gerenciamento baseada em claims do JWT
    
  2. Segurança
    - Mantém RLS ativo
    - Evita recursão infinita usando claims do JWT
    - Garante que apenas admins podem gerenciar funções
*/

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Permitir leitura pública para usuários autenticados
CREATE POLICY "Allow authenticated read access"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir que admins gerenciem funções (baseado em claim do JWT)
CREATE POLICY "Allow admin manage roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');