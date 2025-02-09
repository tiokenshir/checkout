import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Box, Spinner, Text, VStack } from '@chakra-ui/react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Box height="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="brand.500" />
      </Box>
    )
  }

  if (error) {
    return (
      <Box height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Text color="red.500" fontSize="lg">
            Erro ao verificar autenticação
          </Text>
          <Text color="gray.600">
            Por favor, tente novamente mais tarde
          </Text>
        </VStack>
      </Box>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}