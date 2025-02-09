import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      navigate('/admin')
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao fazer login',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp() {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'admin'
          }
        }
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Conta criada com sucesso! Você já pode fazer login.',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao criar conta',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxW="container.sm" py={10}>
      <Box bg="white" p={8} borderRadius="lg" boxShadow="sm">
        <Heading size="lg" mb={8} textAlign="center">
          Admin Login
        </Heading>

        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Senha</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="brand"
              size="lg"
              isLoading={loading}
            >
              Entrar
            </Button>

            <Text textAlign="center">ou</Text>

            <Button
              type="button"
              variant="outline"
              colorScheme="brand"
              size="lg"
              isLoading={loading}
              onClick={handleSignUp}
            >
              Criar Conta
            </Button>
          </Stack>
        </form>
      </Box>
    </Container>
  )
}