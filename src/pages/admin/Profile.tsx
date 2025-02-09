import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  useToast,
  Avatar,
  Text,
  Card,
  CardHeader,
  CardBody,
  Divider,
} from '@chakra-ui/react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export function Profile() {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.name || '',
    title: user?.user_metadata?.title || '',
    phone: user?.user_metadata?.phone || '',
    avatar_url: user?.user_metadata?.avatar_url || '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: profile.name,
          title: profile.title,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
        }
      })

      if (error) throw error

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao atualizar perfil',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxW="container.md" py={8}>
      <Card>
        <CardHeader>
          <Heading size="lg">Meu Perfil</Heading>
        </CardHeader>

        <CardBody>
          <VStack as="form" spacing={6} onSubmit={handleSubmit}>
            {/* Avatar e informações básicas */}
            <Box textAlign="center" w="full">
              <Avatar
                size="2xl"
                name={profile.name || user?.email}
                src={profile.avatar_url}
                mb={4}
              />
              <Text color="gray.600" fontSize="sm">
                {user?.email}
              </Text>
            </Box>

            <Divider />

            {/* Formulário */}
            <FormControl isRequired>
              <FormLabel>Nome Completo</FormLabel>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Seu nome completo"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Cargo</FormLabel>
              <Input
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                placeholder="Ex: Gerente de Vendas"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Telefone</FormLabel>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </FormControl>

            <FormControl>
              <FormLabel>URL da Foto</FormLabel>
              <Input
                value={profile.avatar_url}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://..."
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="brand"
              size="lg"
              width="full"
              isLoading={loading}
            >
              Salvar Alterações
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </Container>
  )
}