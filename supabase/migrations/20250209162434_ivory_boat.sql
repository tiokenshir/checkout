/*
  # Corrigir políticas da tabela user_roles

  1. Alterações
    - Remove políticas existentes
    - Adiciona novas políticas sem recursão
    - Adiciona política para permitir leitura de própria função
    - Adiciona política para permitir admin gerenciar funções

  2. Segurança
    - Mantém RLS ativo
    - Previne recursão infinita
    - Garante que apenas admins podem gerenciar funções
*/

-- Remover políticas existentes
DROP POLICY IF EXISTS "Allow admin read access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow admin manage user_roles" ON user_roles;

-- Permitir que usuários vejam sua própria função
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Permitir que admins vejam todas as funções
CREATE POLICY "Admins can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Permitir que admins gerenciem funções
CREATE POLICY "Admins can manage roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );